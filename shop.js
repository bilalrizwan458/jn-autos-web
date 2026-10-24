  import { StoreManager } from './firebase-config.js';
  import { addToCart } from './cart.js';

  const shopProductsGrid = document.getElementById('shopProductsGrid');
  const searchInput = document.getElementById('searchInput');
  const makeSelect = document.getElementById('makeSelect');
  const modelSelect = document.getElementById('modelSelect');
  const categoryFilterList = document.getElementById('categoryFilterList');
  const sortSelect = document.getElementById('sortSelect');
  const showingCount = document.getElementById('showingCount');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  let allProducts = [];
  let activeProduct = null;

  function distinctValues(values) {
    return [...new Map(values.filter(Boolean).map(value => [value.toLowerCase(), value])).values()].sort((a, b) => a.localeCompare(b));
  }

  function populateShopFilters() {
    const catalogOptions = StoreManager.getCatalogOptions();
    const selectedMake = makeSelect.value;
    const selectedModel = modelSelect.value;
    const makes = distinctValues([...catalogOptions.makes, ...allProducts.map(product => product.make)]);
    makeSelect.replaceChildren(new Option('All Makes', 'All'));
    makes.forEach(make => makeSelect.add(new Option(make === 'Universal' ? 'Universal Fitment' : make, make)));
    makeSelect.value = makes.includes(selectedMake) ? selectedMake : 'All';

    const models = distinctValues([...catalogOptions.models, ...allProducts.map(product => product.model)]);
    modelSelect.replaceChildren(new Option('All Models', 'All'));
    models.forEach(model => modelSelect.add(new Option(model, model)));
    modelSelect.value = models.includes(selectedModel) ? selectedModel : 'All';

    const selectedCategories = new Set(Array.from(categoryFilterList.querySelectorAll('.cat-check:checked')).map(input => input.value));
    const categories = distinctValues([...catalogOptions.categories, ...allProducts.map(product => product.category)]);
    categoryFilterList.replaceChildren();
    const allLabel = document.createElement('label');
    allLabel.className = 'form-check';
    allLabel.innerHTML = '<input class="form-check-input cat-check" type="checkbox" value="All" id="catAll"><span class="form-check-label">All Categories</span>';
    const allInput = allLabel.querySelector('input');
    allInput.checked = selectedCategories.size === 0 || selectedCategories.has('All');
    categoryFilterList.append(allLabel);
    categories.forEach((category, index) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'form-check';
      const input = document.createElement('input');
      input.className = 'form-check-input cat-check';
      input.type = 'checkbox';
      input.value = category;
      input.id = `shopCategory${index}`;
      input.checked = selectedCategories.has(category);
      const label = document.createElement('span');
      label.className = 'form-check-label';
      label.textContent = category;
      wrapper.append(input, label);
      categoryFilterList.append(wrapper);
    });
    if (Array.from(categoryFilterList.querySelectorAll('.cat-check:not([value="All"]):checked')).length > 0) {
      allInput.checked = false;
    }
  }

  function renderShopProducts() {

    const query = searchInput.value.toLowerCase().trim();
    const make = makeSelect.value;
    const model = modelSelect.value;
    const sort = sortSelect.value;

    // Get checked categories
    const checkedCats = Array.from(document.querySelectorAll('.cat-check:checked')).map(cb => cb.value);

    let filtered = allProducts.filter(p => {
      // Search term
      const matchesQuery = !query || 
        p.name.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query) ||
        p.make.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.model && p.model.toLowerCase().includes(query)) ||
        (p.partNumber && p.partNumber.toLowerCase().includes(query));

      // Make filter
      const matchesMake = (make === 'All') || (p.make.toLowerCase() === make.toLowerCase());

      // Model filter
      const matchesModel = (model === 'All') || (p.model && p.model.toLowerCase() === model.toLowerCase());

      // Category filter
      const matchesCat = checkedCats.includes('All') || checkedCats.includes(p.category);

      return matchesQuery && matchesMake && matchesModel && matchesCat;
    });

    // Sorting
    if (sort === 'lowToHigh') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'highToLow') {
      filtered.sort((a, b) => b.price - a.price);
    }

    showingCount.textContent = filtered.length;

    if (filtered.length === 0) {
      shopProductsGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fa-solid fa-magnifying-glass   fs-1 mb-3"></i>
          <h5 class="fw-bold">No Products Found</h5>
          <p class="  small">Try searching with a different keyword or resetting your filters.</p>
        </div>
      `;
      return;
    }

    shopProductsGrid.innerHTML = filtered.map((p, idx) => `
      <div class="col-6 col-md-4">
        <div class="product-card">
          <div class="position-relative overflow-hidden product-img-box" style="cursor:pointer;" data-idx="${idx}">
            <img src="${p.imageUrl || './images/turbo.jpg'}" alt="${p.name}">
            <span class="badge bg-dark border position-absolute top-0 end-0 m-2 small" style="border-color:var(--border) !important;">
              ${p.fitmentType === 'universal' ? 'Universal' : p.make}
            </span>
            ${(p.images && p.images.length > 1) ? `<span class="badge bg-danger position-absolute bottom-0 start-0 m-2 small"><i class="fa-solid fa-images me-1"></i>${p.images.length} Photos</span>` : ''}
          </div>
          <div class="body">
            <span class="  small brand-font mb-1" style="font-size: .75rem;">${p.category.toUpperCase()}</span>
            <div class="name fw-bold" style="cursor:pointer;" data-idx="${idx}">${p.name}</div>
            ${p.partNumber ? `<small class="  d-block mb-2" style="font-size:.72rem;">OEM Part #: ${p.partNumber}</small>` : ''}
            <div class="price">Rs. ${p.price.toLocaleString()}</div>
            <div class="d-flex gap-1 mt-auto">
              <button class="btn btn-sm btn-outline-light w-50 view-details-btn" data-idx="${idx}"><i class="fa-solid fa-eye me-1"></i>Photos</button>
              <button class="btn-jn-red add-to-cart w-50 p-2" data-idx="${idx}"><i class="fa-solid fa-cart-plus"></i> Cart</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('#shopProductsGrid .add-to-cart').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        const product = filtered[Number(button.dataset.idx)];
        if (product) addToCart(product);
      });
    });

    // Bind Photo Gallery Modal Opener
    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    document.querySelectorAll('.view-details-btn, .product-img-box, .name[data-idx]').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
        const p = filtered[idx];
        if (!p) return;
        activeProduct = p;

        const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.imageUrl || './images/turbo.jpg'];

        document.getElementById('modalProductName').textContent = p.name;
        document.getElementById('modalTitle').textContent = p.name;
        document.getElementById('modalCategory').textContent = p.category;
        document.getElementById('modalPrice').textContent = `Rs. ${p.price.toLocaleString()}`;
        document.getElementById('modalMakeModel').textContent = `${p.make} ${p.model !== 'All' ? p.model : ''}`;
        document.getElementById('modalYear').textContent = p.year || 'Universal';
        document.getElementById('modalPartNumber').textContent = p.partNumber || 'N/A';
        document.getElementById('modalFitment').textContent = p.fitmentType === 'universal' ? 'Universal (Fits All Cars)' : 'Car Specific';
        document.getElementById('modalStock').textContent = `${p.stock || 10} Units In Stock`;
        document.getElementById('modalDescription').textContent = p.description || 'Genuine auto part sourced from verified suppliers.';

        // Render main photo and thumbnail gallery
        const modalMainImg = document.getElementById('modalMainImg');
        const modalPhotoCountBadge = document.getElementById('modalPhotoCountBadge');
        const modalThumbsContainer = document.getElementById('modalThumbsContainer');

        function setMainPhoto(imgUrl, photoIdx) {
          modalMainImg.src = imgUrl;
          modalPhotoCountBadge.textContent = `Photo ${photoIdx + 1} of ${images.length}`;
        }

        setMainPhoto(images[0], 0);

        // Thumbnail strip
        modalThumbsContainer.innerHTML = images.map((img, i) => `
          <img src="${img}" class="modal-thumb-item rounded border ${i === 0 ? 'border-danger' : ''}" data-idx="${i}" style="width:55px;height:55px;object-fit:cover;cursor:pointer;flex-shrink:0;border-color:var(--border) !important;">
        `).join('');

        document.querySelectorAll('.modal-thumb-item').forEach(thumb => {
          thumb.addEventListener('click', (ev) => {
            const i = parseInt(ev.target.getAttribute('data-idx'));
            document.querySelectorAll('.modal-thumb-item').forEach(t => t.classList.remove('border-danger'));
            ev.target.classList.add('border-danger');
            setMainPhoto(images[i], i);
          });
        });

        productModal.show();
      });
    });
  }

  document.getElementById('modalAddToCartBtn').addEventListener('click', () => {
    if (activeProduct) addToCart(activeProduct);
  });

  // Handle Category check behavior
  categoryFilterList.addEventListener('change', (e) => {
    if (!e.target.matches('.cat-check')) return;
    if (e.target.value === 'All' && e.target.checked) {
      categoryFilterList.querySelectorAll('.cat-check').forEach(other => {
        if (other.value !== 'All') other.checked = false;
      });
    } else if (e.target.value !== 'All' && e.target.checked) {
      document.getElementById('catAll').checked = false;
    }
    renderShopProducts();
  });

  searchInput.addEventListener('input', renderShopProducts);
  makeSelect.addEventListener('change', renderShopProducts);
  modelSelect.addEventListener('change', renderShopProducts);
  sortSelect.addEventListener('change', renderShopProducts);

  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    makeSelect.value = 'All';
    modelSelect.value = 'All';
    sortSelect.value = 'featured';
    categoryFilterList.querySelectorAll('.cat-check').forEach(cb => cb.checked = (cb.value === 'All'));
    renderShopProducts();
  });

  async function initializeShop() {
    allProducts = await StoreManager.getProducts();
    populateShopFilters();
    renderShopProducts();
  }

  initializeShop();

