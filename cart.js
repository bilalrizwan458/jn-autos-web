const CART_STORAGE_KEY = 'jnautos-cart';
const defaultImage = './images/turbo.jpg';
const currency = new Intl.NumberFormat('en-PK');

function getCart() {
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  if (!stored) return [];

  let items;
  try {
    items = JSON.parse(stored);
  } catch (error) {
    throw new Error(`Could not read your saved cart: ${error.message}`);
  }
  if (!Array.isArray(items)) throw new Error('Your saved cart has an invalid format.');
  return items;
}

function saveCart(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('jnautos-cart-updated'));
}

function showCartMessage(message, type = 'success') {
  let toast = document.getElementById('cartToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.className = 'cart-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }
  toast.className = `cart-toast ${type === 'error' ? 'cart-toast-error' : ''}`;
  toast.textContent = message;
  toast.classList.add('cart-toast-visible');
  window.clearTimeout(showCartMessage.timeout);
  showCartMessage.timeout = window.setTimeout(() => toast.classList.remove('cart-toast-visible'), 2600);
}

function refreshCartBadges() {
  try {
    const count = getCart().reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('#cartCount').forEach(badge => {
      badge.textContent = String(count);
      badge.setAttribute('aria-label', `${count} items in cart`);
    });
  } catch (error) {
    document.querySelectorAll('#cartCount').forEach(badge => {
      badge.textContent = '!';
      badge.setAttribute('aria-label', 'Cart could not be loaded');
    });
    showCartMessage(error.message, 'error');
  }
}

export function addToCart(product) {
  const itemId = String(product.id ?? product.uid ?? '').trim();
  const name = String(product.name ?? '').trim();
  const price = Number(product.price);
  const stock = Number.isFinite(Number(product.stock)) ? Math.max(0, Number(product.stock)) : 10;
  if (!itemId || !name || !Number.isFinite(price) || price < 0) {
    showCartMessage('This product cannot be added to the cart.', 'error');
    return;
  }
  if (stock < 1) {
    showCartMessage(`${name} is currently out of stock.`, 'error');
    return;
  }

  try {
    const items = getCart();
    const existing = items.find(item => item.id === itemId);
    if (existing) {
      if (existing.quantity >= stock) {
        showCartMessage(`Only ${stock} unit(s) of ${name} are available.`, 'error');
        return;
      }
      existing.quantity += 1;
      existing.stock = stock;
      existing.price = price;
      existing.name = name;
      existing.imageUrl = product.imageUrl || product.image || existing.imageUrl || defaultImage;
    } else {
      items.push({
        id: itemId,
        name,
        price,
        imageUrl: product.imageUrl || product.image || defaultImage,
        quantity: 1,
        stock
      });
    }
    saveCart(items);
    showCartMessage(`${name} added to your cart.`);
  } catch (error) {
    showCartMessage(error.message || 'Could not save your cart.', 'error');
  }
}

function updateCartItem(itemId, action) {
  try {
    const items = getCart();
    const item = items.find(cartItem => cartItem.id === itemId);
    if (!item) return;

    if (action === 'remove') {
      saveCart(items.filter(cartItem => cartItem.id !== itemId));
    } else if (action === 'increase') {
      if (item.quantity >= item.stock) {
        showCartMessage(`Only ${item.stock} unit(s) of ${item.name} are available.`, 'error');
        return;
      }
      item.quantity += 1;
      saveCart(items);
    } else if (action === 'decrease') {
      item.quantity -= 1;
      if (item.quantity < 1) {
        saveCart(items.filter(cartItem => cartItem.id !== itemId));
      } else {
        saveCart(items);
      }
    }
  } catch (error) {
    showCartMessage(error.message || 'Could not update your cart.', 'error');
  }
}

function createCartItem(item) {
  const row = document.createElement('article');
  row.className = 'cart-item';

  const image = document.createElement('img');
  image.className = 'cart-item-image';
  image.src = item.imageUrl || defaultImage;
  image.alt = item.name;

  const details = document.createElement('div');
  details.className = 'cart-item-details';
  const name = document.createElement('h2');
  name.className = 'h5 fw-bold mb-1';
  name.textContent = item.name;
  const price = document.createElement('p');
  price.className = '  small mb-2';
  price.textContent = `Rs. ${currency.format(item.price)} each`;
  details.append(name, price);

  const controls = document.createElement('div');
  controls.className = 'cart-item-controls';
  const decrease = document.createElement('button');
  decrease.type = 'button';
  decrease.className = 'btn btn-sm btn-jn-outline';
  decrease.dataset.cartAction = 'decrease';
  decrease.dataset.cartId = item.id;
  decrease.setAttribute('aria-label', `Decrease ${item.name} quantity`);
  decrease.textContent = '−';
  const quantity = document.createElement('span');
  quantity.className = 'cart-quantity';
  quantity.textContent = String(item.quantity);
  const increase = document.createElement('button');
  increase.type = 'button';
  increase.className = 'btn btn-sm btn-jn-outline';
  increase.dataset.cartAction = 'increase';
  increase.dataset.cartId = item.id;
  increase.setAttribute('aria-label', `Increase ${item.name} quantity`);
  increase.textContent = '+';
  controls.append(decrease, quantity, increase);

  const lineTotal = document.createElement('strong');
  lineTotal.className = 'cart-line-total';
  lineTotal.textContent = `Rs. ${currency.format(item.price * item.quantity)}`;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn-link text-danger p-0 cart-remove';
  remove.dataset.cartAction = 'remove';
  remove.dataset.cartId = item.id;
  remove.setAttribute('aria-label', `Remove ${item.name} from cart`);
  remove.innerHTML = '<i class="fa-solid fa-trash-can me-1" aria-hidden="true"></i>Remove';

  row.append(image, details, controls, lineTotal, remove);
  return row;
}

function renderCartPage() {
  const list = document.getElementById('cartItems');
  if (!list) return;
  try {
    const items = getCart();
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const summary = document.getElementById('cartSummary');
    const empty = document.getElementById('cartEmpty');
    const checkout = document.getElementById('cartCheckout');

    list.replaceChildren(...items.map(createCartItem));
    document.getElementById('cartPageCount').textContent = String(totalItems);
    document.getElementById('cartSubtotal').textContent = `Rs. ${currency.format(subtotal)}`;
    empty.classList.toggle('d-none', items.length > 0);
    summary.classList.toggle('d-none', items.length === 0);
    checkout.classList.toggle('d-none', items.length === 0);

    if (items.length > 0) {
      const orderLines = items.map(item =>
        `${item.name} x ${item.quantity} - Rs. ${currency.format(item.price * item.quantity)}`
      );
      const message = [
        'Hello JN Autos, I would like to place this order:',
        '',
        ...orderLines,
        '',
        `Total: Rs. ${currency.format(subtotal)}`
      ].join('\n');
      checkout.href = `https://wa.me/923708521407?text=${encodeURIComponent(message)}`;
    }
  } catch (error) {
    list.replaceChildren();
    document.getElementById('cartPageCount').textContent = '0';
    document.getElementById('cartSubtotal').textContent = 'Rs. 0';
    document.getElementById('cartSummary').classList.add('d-none');
    document.getElementById('cartCheckout').classList.add('d-none');
    document.getElementById('cartEmpty').classList.remove('d-none');
    showCartMessage(error.message || 'Could not load your cart.', 'error');
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('.add-to-cart[data-product-id]');
  if (!button) return;
  const card = button.closest('.product-card');
  const name = card?.querySelector('.name')?.textContent?.trim();
  const priceText = card?.querySelector('.price')?.textContent || '';
  const image = card?.querySelector('img')?.getAttribute('src');
  const priceMatch = priceText.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  const price = priceMatch ? Number(priceMatch[0]) : Number.NaN;
  addToCart({
    id: button.dataset.productId,
    name,
    price,
    image,
    stock: 10
  });
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-cart-action][data-cart-id]');
  if (!button) return;
  updateCartItem(button.dataset.cartId, button.dataset.cartAction);
});

window.addEventListener('jnautos-cart-updated', () => {
  refreshCartBadges();
  renderCartPage();
});
window.addEventListener('storage', event => {
  if (event.key === CART_STORAGE_KEY) {
    refreshCartBadges();
    renderCartPage();
  }
});

refreshCartBadges();
renderCartPage();
