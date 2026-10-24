 import { StoreManager } from './firebase-config.js';

  // TEMPORARY TEST SETTING: turn this off to require authenticated staff again.
  const PUBLIC_TEST_MODE = true;
  const authModeBadge = document.getElementById('authModeBadge');
  if (PUBLIC_TEST_MODE) {
    authModeBadge.className = 'badge bg-warning text-dark px-3 py-2 fs-6';
    authModeBadge.textContent = 'Public Test Mode';
    document.getElementById('logoutBtn').classList.add('d-none');
    document.querySelector('#dashboardContainer details').classList.add('d-none');
  } else if (StoreManager.isFirebaseConfigured()) {
    authModeBadge.className = 'badge bg-success px-3 py-2 fs-6';
    authModeBadge.innerHTML = '<i class="fa-solid fa-cloud me-1"></i>Firebase Staff Auth';
  } else {
    authModeBadge.className = 'badge bg-warning text-dark px-3 py-2 fs-6';
    authModeBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i>Firebase Setup Required';
  }

  // State elements
  const sessionGuard = document.getElementById('sessionGuard');
  const dashboardContainer = document.getElementById('dashboardContainer');
  const authAlert = document.getElementById('authAlert');

  const welcomeUserHeading = document.getElementById('welcomeUserHeading');
  const dashboardAlert = document.getElementById('dashboardAlert');
  const logoutBtn = document.getElementById('logoutBtn');

  const addProductForm = document.getElementById('addProductForm');
  const inventoryTableBody = document.getElementById('inventoryTableBody');
  const tableSearchInput = document.getElementById('tableSearchInput');
  const tableCategoryFilter = document.getElementById('tableCategoryFilter');
  const tableMakeFilter = document.getElementById('tableMakeFilter');
  const tableModelFilter = document.getElementById('tableModelFilter');

  const statTotalProducts = document.getElementById('statTotalProducts');
  const statTotalCategories = document.getElementById('statTotalCategories');
  const statTotalStock = document.getElementById('statTotalStock');

  function setSelectOptions(select, values, allLabel, selectedValue) {
    select.replaceChildren(new Option(allLabel, ''));
    values.forEach(value => select.add(new Option(value === 'Universal' ? 'Universal (All Cars)' : value, value)));
    select.value = values.includes(selectedValue) ? selectedValue : '';
  }

  function renderCustomOptions(container, values, type) {
    container.replaceChildren();
    if (values.length === 0) {
      const empty = document.createElement('small');
      empty.className = ' ';
      empty.textContent = 'No custom choices added';
      container.append(empty);
      return;
    }
    values.forEach(value => {
      const badge = document.createElement('span');
      badge.className = 'badge bg-secondary d-inline-flex align-items-center gap-2 py-2';
      badge.append(document.createTextNode(value));
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn-close btn-close-white';
      removeButton.setAttribute('aria-label', `Remove ${value}`);
      removeButton.addEventListener('click', () => {
        if (confirm(`Remove ${value} from the available choices? Existing products will keep this value.`)) {
          StoreManager.removeCatalogOption(type, value);
          loadProductsTable();
        }
      });
      badge.append(removeButton);
      container.append(badge);
    });
  }

  function refreshCatalogControls(products) {
    const catalogOptions = StoreManager.getCatalogOptions();
    const categories = [...new Set([...catalogOptions.categories, ...products.map(product => product.category).filter(Boolean)])].sort();
    const makes = [...new Set([...catalogOptions.makes, ...products.map(product => product.make).filter(Boolean)])].sort();
    const models = [...new Set([...catalogOptions.models, ...products.map(product => product.model).filter(Boolean)])].sort();
    const selectedCategory = document.getElementById('pCategory').value;
    const selectedMake = document.getElementById('pMake').value;
    setSelectOptions(document.getElementById('pCategory'), categories, 'Choose category', selectedCategory);
    setSelectOptions(document.getElementById('pMake'), makes, 'Choose make', selectedMake);
    setSelectOptions(tableCategoryFilter, categories, 'All categories', tableCategoryFilter.value);
    setSelectOptions(tableMakeFilter, makes, 'All makes', tableMakeFilter.value);
    setSelectOptions(tableModelFilter, models, 'All models', tableModelFilter.value);
    document.getElementById('carModelSuggestions').replaceChildren(...models.map(model => new Option(model, model)));
    renderCustomOptions(document.getElementById('customCategoryList'), catalogOptions.customCategories, 'categories');
    renderCustomOptions(document.getElementById('customMakeList'), catalogOptions.customMakes, 'makes');
    renderCustomOptions(document.getElementById('customModelList'), catalogOptions.customModels, 'models');
  }

  function addCatalogChoice(inputId, type) {
    const input = document.getElementById(inputId);
    try {
      StoreManager.addCatalogOption(type, input.value);
      input.value = '';
      loadProductsTable();
    } catch (err) {
      alert(err.message);
    }
  }

  document.getElementById('addCategoryBtn').addEventListener('click', () => addCatalogChoice('newCategoryInput', 'categories'));
  document.getElementById('addMakeBtn').addEventListener('click', () => addCatalogChoice('newMakeInput', 'makes'));
  document.getElementById('addModelBtn').addEventListener('click', () => addCatalogChoice('newModelInput', 'models'));
  document.getElementById('newCategoryInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCatalogChoice('newCategoryInput', 'categories'); }
  });
  document.getElementById('newMakeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCatalogChoice('newMakeInput', 'makes'); }
  });
  document.getElementById('newModelInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCatalogChoice('newModelInput', 'models'); }
  });

  // Check login session
  async function checkSession() {
    const user = PUBLIC_TEST_MODE ? null : await StoreManager.getCurrentUser();
    if (PUBLIC_TEST_MODE || user) {
      sessionGuard.classList.add('d-none');
      dashboardContainer.classList.remove('d-none');
      welcomeUserHeading.textContent = PUBLIC_TEST_MODE
        ? 'Welcome, Public Test Mode'
        : `Welcome, ${user.fullName || user.email}`;
      dashboardAlert.classList.add('d-none');
      await loadProductsTable();
      dashboardContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.replace('staff-auth.html');
    }
  }

  // Logout handler
  logoutBtn.addEventListener('click', async () => {
    await StoreManager.logoutUser();
    await checkSession();
  });

  document.getElementById('passwordChangeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentStaffPassword').value;
    const newPassword = document.getElementById('newStaffPassword').value;
    const confirmPassword = document.getElementById('confirmStaffPassword').value;
    const alertBox = document.getElementById('passwordChangeAlert');
    if (newPassword !== confirmPassword) {
      alertBox.className = 'alert alert-danger py-2 px-3 small';
      alertBox.textContent = 'The new passwords do not match.';
      return;
    }
    try {
      await StoreManager.changePassword(currentPassword, newPassword);
      e.currentTarget.reset();
      alertBox.className = 'alert alert-success py-2 px-3 small';
      alertBox.textContent = 'Password changed. Use the new password the next time you sign in.';
    } catch (err) {
      alertBox.className = 'alert alert-danger py-2 px-3 small';
      alertBox.textContent = err.message || 'Could not change the password.';
    }
  });

  document.getElementById('clearStaffDataBtn').addEventListener('click', async () => {
    const confirmed = confirm('Replace your email on product creator labels saved in this browser? Products and Firebase accounts will remain.');
    if (!confirmed) return;
    try {
      await StoreManager.clearLocalStaffData();
      alert('Your email was removed from locally saved product creator labels. Firebase accounts are unchanged.');
    } catch (err) {
      alert(err.message);
    }
    await StoreManager.logoutUser();
    await checkSession();
  });

  // Load Inventory Table & Stats
  async function loadProductsTable() {
    let products;
    try {
      products = await StoreManager.getProducts();
    } catch (err) {
      dashboardAlert.className = 'alert alert-danger py-2 px-3 small mb-4';
      dashboardAlert.textContent = err.message || 'Could not load the product inventory.';
      return;
    }
    dashboardAlert.classList.add('d-none');
    refreshCatalogControls(products);
    const query = tableSearchInput.value.toLowerCase().trim();
    const category = tableCategoryFilter.value;
    const make = tableMakeFilter.value;
    const model = tableModelFilter.value;

    const filtered = products.filter(p =>
      (!query || p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.make.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.partNumber && p.partNumber.toLowerCase().includes(query))) &&
      (!category || p.category === category) &&
      (!make || p.make === make) &&
      (!model || (p.model && p.model.toLowerCase() === model.toLowerCase()))
    );

    // Update Stats
    statTotalProducts.textContent = products.length;
    const categoriesSet = new Set(products.map(p => p.category));
    statTotalCategories.textContent = categoriesSet.size;
    const totalStock = products.reduce((acc, p) => acc + (parseInt(p.stock) || 0), 0);
    statTotalStock.textContent = totalStock;

    // Populate Table
    inventoryTableBody.innerHTML = filtered.map(p => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${p.imageUrl || './images/turbo.jpg'}" class="table-img" alt="${p.name}">
            <div>
              <div class="fw-bold text-light fs-6">${p.name}</div>
              <small class=" ">${p.partNumber ? 'OEM: ' + p.partNumber : 'Fit: ' + p.fitmentType}</small>
            </div>
          </div>
        </td>
        <td><span class="badge bg-secondary">${p.category}</span></td>
        <td class="small  ">${p.make} ${p.model !== 'All' ? p.model : ''}</td>
        <td>
          <strong class="text-red">Rs. ${p.price.toLocaleString()}</strong>
        </td>
        <td>${p.stock}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-warning edit-price-btn" data-id="${p.id}" data-price="${p.price}" title="Edit Price"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-outline-danger del-btn" data-id="${p.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

    // Attach Event Listeners to Delete Buttons
    document.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this product?")) {
          await StoreManager.deleteProduct(id);
          loadProductsTable();
        }
      });
    });

    // Attach Event Listeners to Edit Price Buttons
    document.querySelectorAll('.edit-price-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const oldPrice = e.currentTarget.getAttribute('data-price');
        const newPrice = prompt("Enter new price in Rs.:", oldPrice);
        if (newPrice !== null && newPrice.trim() !== "") {
          await StoreManager.updateProductPrice(id, newPrice);
          loadProductsTable();
        }
      });
    });
  }

  tableSearchInput.addEventListener('input', loadProductsTable);
  tableCategoryFilter.addEventListener('change', loadProductsTable);
  tableMakeFilter.addEventListener('change', loadProductsTable);
  tableModelFilter.addEventListener('change', loadProductsTable);

  // Multi-Photo Gallery State Management (Up to 12 Photos)
  let selectedPhotosList = [];

  const pImageFiles = document.getElementById('pImageFiles');
  const pImageUrlTextarea = document.getElementById('pImageUrlTextarea');
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const photoCountBadge = document.getElementById('photoCountBadge');

  function renderPhotoPreviews() {
    photoCountBadge.textContent = `${selectedPhotosList.length} / 12 Selected`;
    if (selectedPhotosList.length === 0) {
      photoPreviewContainer.innerHTML = `<small class="  m-auto">No photos added yet. Select files or paste URLs above.</small>`;
      return;
    }
    photoPreviewContainer.innerHTML = selectedPhotosList.map((url, idx) => `
      <div class="position-relative" style="width:65px;height:65px;background:var(--bg-elevated-2);border-radius:6px;">
        <img src="${url}" style="width:100%;height:100%;object-fit:contain;padding:2px;border-radius:6px;border:1px solid var(--border);">
        <span class="badge bg-danger position-absolute top-0 end-0 translate-middle-y rounded-circle remove-photo-btn" data-idx="${idx}" style="cursor:pointer;padding:2px 5px;font-size:10px;">×</span>
        ${idx === 0 ? '<span class="badge bg-primary position-absolute bottom-0 start-0 w-100 text-center" style="font-size:8px;padding:1px 0;">Main Photo</span>' : `<span class="badge bg-dark position-absolute bottom-0 start-0 w-100 text-center" style="font-size:8px;padding:1px 0;">Photo ${idx+1}</span>`}
      </div>
    `).join('');

    document.querySelectorAll('.remove-photo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        selectedPhotosList.splice(idx, 1);
        renderPhotoPreviews();
      });
    });
  }

  // Handle File Input Selection (converts to Data URLs for preview & storage)
  pImageFiles.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (selectedPhotosList.length >= 12) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (selectedPhotosList.length < 12) {
          selectedPhotosList.push(evt.target.result);
          renderPhotoPreviews();
        }
      };
      reader.readAsDataURL(file);
    });
  });

  // Handle URL Textarea Input
  pImageUrlTextarea.addEventListener('input', (e) => {
    const text = e.target.value.trim();
    if (!text) return;
    const urls = text.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    urls.forEach(url => {
      if (selectedPhotosList.length < 12 && !selectedPhotosList.includes(url)) {
        selectedPhotosList.push(url);
      }
    });
    renderPhotoPreviews();
  });

  // Add Single Product Form Submit
  addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = addProductForm.querySelector('[type="submit"]');
    submitButton.disabled = true;

    try {
      const user = PUBLIC_TEST_MODE ? null : await StoreManager.getCurrentUser();

      // Default photo if none selected
      let finalImages = [...selectedPhotosList];
      if (finalImages.length === 0) {
        finalImages = ['./images/turbo.jpg'];
      }

      const newProduct = {
        name: document.getElementById('pName').value.trim(),
        category: document.getElementById('pCategory').value,
        price: parseFloat(document.getElementById('pPrice').value),
        make: document.getElementById('pMake').value,
        model: document.getElementById('pModel').value.trim() || 'All Models',
        year: document.getElementById('pYear').value.trim() || 'Universal',
        partNumber: document.getElementById('pPartNumber').value.trim(),
        fitmentType: document.getElementById('pFitment').value,
        stock: parseInt(document.getElementById('pStock').value) || 10,
        description: document.getElementById('pDescription').value.trim(),
        images: finalImages,
        imageUrl: finalImages[0],
        createdBy: user ? user.uid : 'Public Test User'
      };

      await StoreManager.addProduct(newProduct);
      addProductForm.reset();
      selectedPhotosList = [];
      renderPhotoPreviews();
      await loadProductsTable();
      alert(`Product saved successfully with ${finalImages.length} photo(s) and published to the live shop!`);
    } catch (err) {
      alert(err.message || 'Could not save the product. Please try again.');
    } finally {
      submitButton.disabled = false;
    }
  });

  // Download Sample CSV Template
  document.getElementById('downloadCsvTemplateBtn').addEventListener('click', () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Category,Make,Model,Year,PartNumber,FitmentType,Price,Stock,ImageUrl,Description\n" +
      "Double Row Wheel Bearing,Bearings,Toyota,Corolla,2015-2022,90369-W0001,specific,8500,20,./images/turbo.jpg,High quality wheel bearing\n" +
      "Synthetic Motor Oil 5W-40,Lubricants,Universal,All Models,Universal,LUB-5W40,universal,4500,50,./images/engine oil pic.png,Premium synthetic motor oil\n" +
      "Front Ceramic Brake Pads,Brake System,Honda,Civic,2016-2023,06450-S5A-J00,specific,5200,15,./images/brakes.jpg,Ceramic long life brake pads";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jn_autos_sample_catalog.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // CSV File Upload Processing
  document.getElementById('csvFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(evt) {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        alert("CSV file appears to be empty.");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const parsedProducts = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length >= 2) {
          parsedProducts.push({
            name: cols[0] || 'Auto Part',
            category: cols[1] || 'Accessories',
            make: cols[2] || 'Universal',
            model: cols[3] || 'All',
            year: cols[4] || 'Universal',
            partNumber: cols[5] || '',
            fitmentType: cols[6] || 'specific',
            price: cols[7] || 1000,
            stock: cols[8] || 10,
            imageUrl: cols[9] || './images/turbo.jpg',
            description: cols[10] || ''
          });
        }
      }

      try {
        const count = await StoreManager.bulkAddProducts(parsedProducts);
        alert(`Successfully imported ${count} auto parts into inventory!`);
        loadProductsTable();
      } catch (err) {
        alert(err.message || 'Could not import the CSV file. Please try again.');
      }
    };
    reader.readAsText(file);
  });

  if (PUBLIC_TEST_MODE) {
    checkSession().catch(err => {
      dashboardAlert.className = 'alert alert-danger py-2 px-3 small mb-4';
      dashboardAlert.textContent = err.message || 'Could not open the public test dashboard.';
    });
  } else {
    // Restore the Firebase session and show the staff inventory dashboard when signed in.
    StoreManager.initializeAuth().then(checkSession).catch(err => {
      authAlert.textContent = `${err.message || 'Could not restore the staff session.'} Sign in again to continue.`;
      authAlert.classList.remove('d-none');
    });
  }
