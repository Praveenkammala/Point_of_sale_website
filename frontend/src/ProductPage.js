import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import StripeCheckout from "react-stripe-checkout";
import { FaShoppingCart, FaEdit, FaTrash, FaPlus, FaMinus, FaPauseCircle, FaPlayCircle } from "react-icons/fa";

function ProductPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const [form, setForm] = useState({ name: "", price: "", description: "", stock: 10, category: "General" });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  
  const [variantSelections, setVariantSelections] = useState({});
  const [manageVariantsProduct, setManageVariantsProduct] = useState(null);
  const [variantForm, setVariantForm] = useState({ name: "", sku: "", price: "", stock: "" });
  const [selectedProductView, setSelectedProductView] = useState(null);
  const [showSavedCarts, setShowSavedCarts] = useState(false);
  const [dbSavedCarts, setDbSavedCarts] = useState([]);
  const [showPrintReceipt, setShowPrintReceipt] = useState(null);

  const token = localStorage.getItem("token");

  const fetchProducts = async () => {
    try {
      const activeBranch = localStorage.getItem("activeBranch") || 1;
      const res = await axios.get(`http://localhost:5000/api/products?search=${search}&category=${categoryFilter}&branch_id=${activeBranch}`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts(res.data);
    } catch (err) { 
      console.error("Error fetching products"); 
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem("token");
          window.location.href = "/login";
      }
    }
  };

  useEffect(() => { 
      fetchProducts(); 
      const handleBranchChange = () => fetchProducts();
      window.addEventListener('branchChanged', handleBranchChange);
      return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [search, categoryFilter]);

  useEffect(() => {
     // Load held cart if exists
     const heldCart = localStorage.getItem('pos_held_cart');
     if (heldCart) console.log("A cart is currently on hold.");
  }, []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const addProduct = async () => {
    if (!form.name || !form.price) return alert("Enter details");
    const formData = new FormData();
    formData.append("name", form.name); formData.append("price", form.price);
    formData.append("description", form.description); formData.append("stock", form.stock);
    formData.append("category", form.category); if (imageFile) formData.append("file", imageFile);

    try {
      await axios.post("http://localhost:5000/api/products", formData, { headers: { Authorization: `Bearer ${token}` } });
      fetchProducts();
      setForm({ name: "", price: "", description: "", stock: 10, category: "General" });
      setImageFile(null); setPreview(""); setShowAdd(false);
    } catch (err) { alert("Error adding product"); }
  };

  const deleteProduct = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts(products.filter(p => p.id !== id));
    } catch (err) { alert("Error deleting product"); }
  };

  const updateProduct = async () => {
    const formData = new FormData();
    formData.append("name", editItem.name); formData.append("price", editItem.price);
    formData.append("description", editItem.description); formData.append("stock", editItem.stock);
    formData.append("category", editItem.category);
    if (imageFile) formData.append("file", imageFile); else if (editItem.image) formData.append("image", editItem.image);

    try {
      await axios.put(`http://localhost:5000/api/products/${editItem.id}`, formData, { headers: { Authorization: `Bearer ${token}` } });
      fetchProducts(); setEditItem(null); setImageFile(null); setPreview("");
    } catch (err) { alert("Error updating product"); }
  };

  // Dynamic Variable Tax Matrix Based on Category
  const getTaxRate = (category) => {
      switch(category) {
          case 'Electronics': return 0.18; // 18% GST
          case 'Fashion': return 0.12; // 12% GST
          case 'Home': return 0.05; // 5% GST
          default: return 0.00; // General / Zero Tax
      }
  };

  const addToCart = (product) => {
    let price = product.price;
    let stock = product.stock;
    let variantName = null;
    let variantId = null;
    let cartItemId = product.id.toString();

    if (product.variants && product.variants.length > 0) {
        const selectedId = variantSelections[product.id];
        if (!selectedId) return alert("Please select a variant");
        const selectedVariant = product.variants.find(v => v.id == selectedId);
        if (!selectedVariant) return alert("Invalid variant");
        price = selectedVariant.price;
        stock = selectedVariant.stock;
        variantName = selectedVariant.name;
        variantId = selectedVariant.id;
        cartItemId = `${product.id}-${selectedVariant.id}`;
    }

    if (stock <= 0) return alert("Out of stock!");

    const existing = cart.find(item => item.cartId === cartItemId);
    const taxRate = getTaxRate(product.category);

    if (existing) {
      if (existing.qty >= stock) return alert("Cannot exceed stock limit");
      setCart(cart.map(item => item.cartId === cartItemId ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, cartId: cartItemId, variant: variantName, variant_id: variantId, price, stock, qty: 1, taxRate }]);
    }
  };

  const handleVariantChange = (productId, val) => {
      setVariantSelections({...variantSelections, [productId]: val});
  };

  const removeItem = (cartId) => setCart(cart.filter(item => item.cartId !== cartId));
  
  const increaseQty = (cartId, stock) => {
    const item = cart.find(i => i.cartId === cartId);
    if (item.qty >= stock) return alert("Cannot exceed stock limit");
    setCart(cart.map(item => item.cartId === cartId ? { ...item, qty: item.qty + 1 } : item));
  };
  
  const decreaseQty = (cartId) => setCart(cart.map(item => item.cartId === cartId && item.qty > 1 ? { ...item, qty: item.qty - 1 } : item));

  // Cart Math Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxTotal = cart.reduce((sum, item) => sum + (item.price * item.qty * item.taxRate), 0);
  const discountVal = (subtotal + taxTotal) * (discountPercent / 100);
  const grandTotal = (subtotal + taxTotal) - discountVal;

  const validatePromoCode = async () => {
      if(!promoCode) return;
      try {
          const res = await axios.get(`http://localhost:5000/api/promocodes/${promoCode}`, { headers: { Authorization: `Bearer ${token}` } });
          setDiscountPercent(res.data.discount_percent);
          alert(`✅ Code Applied! ${res.data.discount_percent}% off!`);
      } catch(err) {
          alert(err.response?.data?.error || "Invalid code");
          setDiscountPercent(0);
      }
  };

  const fetchSavedCarts = async () => {
      try {
          const res = await axios.get("http://localhost:5000/api/carts", { headers: { Authorization: `Bearer ${token}` } });
          setDbSavedCarts(res.data);
      } catch (err) {}
  };

  const holdCart = async () => {
      if (cart.length === 0) return alert("Cart is already empty.");
      const defaultName = customerName || `Parked Cart - ${new Date().toLocaleTimeString()}`;
      const name = prompt("Enter a name for this held cart (e.g., Table 5, John Doe):", defaultName);
      if (name === null) return;
      try {
          await axios.post("http://localhost:5000/api/carts", { name, cart_data: { cart, customerName, customerPhone, promoCode, discountPercent } }, { headers: { Authorization: `Bearer ${token}` } });
          setCart([]); setCustomerName(""); setCustomerPhone(""); setDiscountPercent(0); setPromoCode(""); setShowCart(false);
          alert("⏸️ Cart saved successfully. Ready for next customer!");
      } catch (err) { alert("Failed to save cart."); }
  };

  const resumeCart = async (savedCart) => {
      setCart(savedCart.cart_data.cart || []); 
      setCustomerName(savedCart.cart_data.customerName || ""); 
      setCustomerPhone(savedCart.cart_data.customerPhone || "");
      setPromoCode(savedCart.cart_data.promoCode || "");
      setDiscountPercent(savedCart.cart_data.discountPercent || 0);
      try {
          await axios.delete(`http://localhost:5000/api/carts/${savedCart.id}`, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {}
      setShowSavedCarts(false);
      setShowCart(true);
  };

  const processSuccessfulCheckout = (orderId, total) => {
      setShowPrintReceipt({ cart, subtotal, taxTotal, discountVal, grandTotal: total, orderId, date: new Date().toLocaleString(), customerName });
      setCart([]); setCustomerName(""); setCustomerPhone(""); setDiscountPercent(0); setPromoCode(""); setShowCart(false);
      fetchProducts();
  };

  const handleToken = async (stripeToken) => {
    if (cart.length === 0) return alert("Cart is empty!");
    const activeBranch = localStorage.getItem("activeBranch") || 1;
    try {
        const stripeRes = await axios.post("http://localhost:5000/api/checkout/stripe", { token: stripeToken, total: grandTotal }, { headers: { Authorization: `Bearer ${token}` } });
        
        if (stripeRes.data.success) {
            const res = await axios.post("http://localhost:5000/api/orders", { cart, total: grandTotal, customer_name: customerName, customer_phone: customerPhone, discount_amount: discountVal, branch_id: activeBranch }, { headers: { Authorization: `Bearer ${token}` } });
            processSuccessfulCheckout(res.data.orderId, grandTotal);
        }
    } catch (err) { alert("Error during checkout via Stripe."); }
  };

  const manualCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    const activeBranch = localStorage.getItem("activeBranch") || 1;
    try {
        const res = await axios.post("http://localhost:5000/api/orders", { cart, total: grandTotal, customer_name: customerName, customer_phone: customerPhone, discount_amount: discountVal, branch_id: activeBranch }, { headers: { Authorization: `Bearer ${token}` } });
        processSuccessfulCheckout(res.data.orderId, grandTotal);
    } catch (err) { alert("Error during checkout pipeline."); }
  };

  return (
    <div className="main">
      <div className="header" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
        <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center'}}>
            <h1 className="logo">🛒 POS Storefront</h1>
            <div className="headerRight" style={{display:'flex', gap:'15px', alignItems:'center'}}>
            
            <button onClick={() => { fetchSavedCarts(); setShowSavedCarts(true); }} style={{padding: '12px', background: '#f39c12', color: 'white', border:'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}><FaPlayCircle /> Saved Carts</button>

            <div className="cartHeader" onClick={() => setShowCart(true)} style={{display: 'flex', alignItems: 'center', gap: '10px', background: '#3498db', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #2980b9'}}>
                <FaShoppingCart size={20} style={{color: '#ffffff'}} /> 
                <span style={{color: '#ffffff', fontWeight: 'bold', fontSize: '16px'}}>Cart ({cart.length}) - ₹ {grandTotal.toFixed(0)}</span>
            </div>
            
            <button className="addBtn" onClick={() => setShowAdd(true)}>
                <FaPlus /> Add Product
            </button>
            
            </div>
        </div>

        <div style={{display: 'flex', gap: '10px', marginTop: '15px', width: '100%'}}>
            <input type="text" placeholder="Search product barcodes..." value={search} onChange={e => setSearch(e.target.value)} style={{padding: '10px', flex: 1, borderRadius: '5px', border:'1px solid #ccc'}} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{padding: '10px', borderRadius: '5px', width: '200px'}}>
                <option value="All">All Regions</option>
                <option value="Electronics">Electronics (18% Tax)</option>
                <option value="Fashion">Fashion (12% Tax)</option>
                <option value="Ethnic">Ethnic & Traditional</option>
                <option value="Accessories">Accessories</option>
                <option value="Beauty">Beauty</option>
                <option value="Fragrances">Fragrances</option>
                <option value="Furniture">Furniture</option>
                <option value="Groceries">Groceries</option>
                <option value="Home">Home (5% Tax)</option>
                <option value="Fitness">Fitness</option>
                <option value="General">General (0%)</option>
            </select>
        </div>
      </div>

      <div className="products">
        {products.map(p => {
          const hasVariants = p.variants && p.variants.length > 0;
          const displayPrice = hasVariants ? `${Math.min(...p.variants.map(v=>v.price))} - ${Math.max(...p.variants.map(v=>v.price))}` : p.price;
          const totalStock = hasVariants ? p.variants.reduce((acc, v) => acc + v.stock, 0) : p.stock;

          return (
          <div className="card" key={p.id} style={{cursor: 'pointer'}} onClick={() => setSelectedProductView(p)}>
            <img src={p.image || "https://via.placeholder.com/150"} alt={p.name} />
            <div className="cardBody">
              <span style={{fontSize: '12px', background: '#eee', padding: '2px 5px', borderRadius: '3px', color: '#333'}}>{p.category}</span>
              <h3 style={{margin: '10px 0', color: '#333'}}>{p.name}</h3>
              <p className="desc" style={{color: '#666', fontSize: '14px', marginBottom: '10px', height: '40px', overflow: 'hidden'}}>{p.description}</p>
              <h4 style={{color: '#333'}}>₹ {hasVariants ? displayPrice : p.price} <span style={{fontSize:'14px', color: totalStock > 0 ? 'green' : 'red', float:'right'}}>{totalStock > 0 ? `${totalStock} in stock` : 'Out of Stock'}</span></h4>

              {hasVariants && <div style={{height: '35px', marginBottom:'10px', color: '#3498db', fontSize: '13px', fontWeight: 'bold'}}>{p.variants.length} Variants Available</div>}
              {!hasVariants && <div style={{height: '35px', marginBottom:'10px'}}></div>}

              <div className="actions">
                <button className="cartBtn" onClick={(e) => { e.stopPropagation(); setSelectedProductView(p); }} style={{background: '#34495e', flex: 1}}>View Details</button>
                {(!hasVariants) && (
                    <button className="cartBtn" onClick={(e) => { e.stopPropagation(); addToCart(p); }} disabled={p.stock <= 0} style={{opacity: p.stock <= 0 ? 0.5 : 1, flex: 1, marginLeft: '5px'}}>Add</button>
                )}
              </div>
            </div>
          </div>
          );
        })}
        {products.length === 0 && <p style={{textAlign:'center', width:'100%', marginTop: '20px', color: '#333'}}>No operational assets found.</p>}
      </div>

      {showCart && (
        <div className="modal">
          <div className="modalBox" style={{width: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
               <h3 style={{color: '#333', margin:0}}>Checkout Payload</h3>
               <button onClick={holdCart} style={{background:'#f39c12', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}><FaPauseCircle/> Hold/Save Cart</button>
            </div>
            
            <div style={{background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '15px'}}>
               <h4 style={{color: '#333', margin: '0 0 10px 0'}}>CRM Customer Target</h4>
               <div style={{display:'flex', gap:'10px'}}>
                   <input placeholder="Name" value={customerName} onChange={e=>setCustomerName(e.target.value)} style={{padding:'8px', width:'50%'}} />
                   <input placeholder="Phone / Loyalty ID" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} style={{padding:'8px', width:'50%'}} />
               </div>
            </div>

            {cart.length === 0 && <p style={{color: '#333', textAlign:'center'}}>Cart registry is empty.</p>}
            
            <div style={{maxHeight:'200px', overflowY:'auto', borderBottom:'1px solid #ddd', paddingBottom:'10px'}}>
            {cart.map(item => (
              <div className="cartRow" key={item.cartId} style={{color: '#333', padding:'10px 0', borderBottom:'1px dashed #eee'}}>
                <div style={{flex: 2}}>
                    <span style={{fontWeight:'bold'}}>{item.name}</span><br/>
                    <span style={{fontSize:'12px', color:'#7f8c8d'}}>{item.variant} | +{(item.taxRate*100)}% Tax</span>
                </div>
                <div className="qty" style={{flex: 1, textAlign:'center'}}>
                  <button onClick={() => decreaseQty(item.cartId)}><FaMinus size={10} /></button>
                  <span style={{padding: '0 10px'}}>{item.qty}</span>
                  <button onClick={() => increaseQty(item.cartId, item.stock)}><FaPlus size={10} /></button>
                </div>
                <span style={{flex: 1, textAlign:'right', fontWeight:'bold'}}>₹ {item.price * item.qty}</span>
                <button className="removeBtn" onClick={() => removeItem(item.cartId)} style={{marginLeft:'10px'}}><FaTrash size={14}/></button>
              </div>
            ))}
            </div>

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'15px', padding:'10px', background:'#ecf0f1', borderRadius:'5px'}}>
                <div style={{display:'flex', gap:'5px', width:'60%'}}>
                    <input placeholder="Promo Code" value={promoCode} onChange={e=>setPromoCode(e.target.value)} style={{padding:'8px', border:'1px solid #ccc', borderRadius:'3px', width:'70%'}}/>
                    <button onClick={validatePromoCode} style={{padding:'8px', background:'#2c3e50', color:'white', border:'none', borderRadius:'3px', cursor:'pointer', width:'30%'}}>Apply</button>
                </div>
                <span style={{color: discountPercent > 0 ? '#27ae60' : '#7f8c8d', fontWeight:'bold', fontSize:'14px'}}>Discount: {discountPercent}%</span>
            </div>

            <div style={{marginTop:'15px', padding:'15px', background:'#2c3e50', color:'white', borderRadius:'8px'}}>
                 <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}><span>Subtotal Vault:</span> <span>₹{subtotal.toFixed(2)}</span></div>
                 <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}><span>Category Taxes Applied:</span> <span>₹{taxTotal.toFixed(2)}</span></div>
                 {discountPercent > 0 && <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px', color:'#f39c12'}}><span>Discount Dropped:</span> <span>-₹{discountVal.toFixed(2)}</span></div>}
                 <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px', borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'10px'}}>
                     <span style={{fontSize:'20px', fontWeight:'bold'}}>Grand Total:</span> 
                     <span style={{fontSize:'20px', fontWeight:'bold', color:'#38ef7d'}}>₹ {grandTotal.toFixed(2)}</span>
                 </div>
            </div>
            
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button className="checkoutBtn" onClick={manualCheckout} style={{flex:1, background:'#2ecc71', fontSize: '16px', padding:'15px'}}>💵 Cash Drawer</button>
              <div style={{flex:1}}>
                  <StripeCheckout
                      stripeKey="pk_test_mockKeyForLocalDev123"
                      token={handleToken}
                      name="Smile Retail POS"
                      amount={grandTotal * 100}
                      currency="INR"
                  >
                     <button className="checkoutBtn" style={{width:'100%', background:'#3498db', fontSize: '16px', padding:'15px', margin:0}}>💳 Stripe Terminal</button>
                  </StripeCheckout>
              </div>
              <button onClick={() => setShowCart(false)} style={{padding:'10px 20px', background:'#95a5a6', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>Exit</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal">
          <div className="modalBox">
            <h3 style={{color: '#333', marginBottom: '15px'}}>Add Matrix Product</h3>
            <input placeholder="Name" onChange={e => setForm({...form, name: e.target.value})}/>
            <input placeholder="Price" type="number" onChange={e => setForm({...form, price: e.target.value})}/>
            <textarea placeholder="Description" onChange={e => setForm({...form, description: e.target.value})}/>
            <div style={{display:'flex', gap:'10px'}}>
                <input placeholder="Stock Capacity" type="number" onChange={e => setForm({...form, stock: e.target.value})} style={{width: '50%'}}/>
                <select onChange={e => setForm({...form, category: e.target.value})} style={{width: '50%'}}>
                    <option value="General">General Framework</option>
                    <option value="Electronics">Electronics Hardware</option>
                    <option value="Fashion">Fashion Apparel</option>
                    <option value="Home">Home Assets</option>
                </select>
            </div>
            <input type="file" accept="image/*" onChange={handleImage}/>
            {preview && <img src={preview} style={{width:'100%', height:'150px', objectFit:'cover', borderRadius:'5px'}} alt="preview"/>}
            <div className="modalActions">
              <button onClick={() => { setShowAdd(false); setPreview(""); setImageFile(null); }}>Abort</button>
              <button onClick={addProduct}>Save Product</button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="modal">
          <div className="modalBox">
            <h3 style={{color: '#333', marginBottom: '15px'}}>Update Matrix Reference</h3>
            <input value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})}/>
            <input value={editItem.price} type="number" onChange={e => setEditItem({...editItem, price: e.target.value})}/>
            <textarea value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})}/>
            <div style={{display:'flex', gap:'10px'}}>
                <input value={editItem.stock} type="number" onChange={e => setEditItem({...editItem, stock: e.target.value})} style={{width: '50%'}}/>
                <select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} style={{width: '50%'}}>
                    <option value="General">General Framework</option>
                    <option value="Electronics">Electronics Hardware</option>
                    <option value="Fashion">Fashion Apparel</option>
                    <option value="Home">Home Assets</option>
                </select>
            </div>
            <input type="file" accept="image/*" onChange={handleImage}/>
            {preview && <img src={preview} style={{width:'100%', height:'150px', objectFit:'cover', borderRadius:'5px'}} alt="preview"/>}
            <div className="modalActions">
              <button onClick={() => { setEditItem(null); setPreview(""); setImageFile(null); }}>Abort</button>
              <button onClick={updateProduct}>Overwrite Object</button>
            </div>
          </div>
        </div>
      )}

      {manageVariantsProduct && (
        <div className="modal">
          <div className="modalBox" style={{width: '600px'}}>
            <h3 style={{color: '#333', marginBottom: '15px'}}>Variants for {manageVariantsProduct.name}</h3>
            <div style={{maxHeight:'200px', overflowY:'auto', borderBottom:'1px solid #ddd', paddingBottom:'10px', marginBottom: '10px'}}>
                {manageVariantsProduct.variants && manageVariantsProduct.variants.length === 0 && <p>No variants exist yet.</p>}
                {manageVariantsProduct.variants && manageVariantsProduct.variants.map(v => (
                    <div key={v.id} style={{display:'flex', justifyContent:'space-between', padding:'10px', borderBottom:'1px solid #eee'}}>
                        <div>
                            <strong>{v.name}</strong> <span style={{fontSize:'12px', color:'#666'}}>({v.sku})</span><br/>
                            ₹{v.price} | {v.stock} in stock
                        </div>
                        <button className="deleteBtn" onClick={async () => {
                            if(window.confirm('Delete this variant?')) {
                                await axios.delete(`http://localhost:5000/api/product_variants/${v.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                fetchProducts();
                                setManageVariantsProduct({...manageVariantsProduct, variants: manageVariantsProduct.variants.filter(va => va.id !== v.id)});
                            }
                        }}><FaTrash/></button>
                    </div>
                ))}
            </div>
            <h4>Add New Variant</h4>
            <div style={{display:'flex', gap:'5px', flexWrap: 'wrap'}}>
                <input placeholder="Name (e.g., Large)" value={variantForm.name} onChange={e => setVariantForm({...variantForm, name: e.target.value})} style={{width: '45%'}}/>
                <input placeholder="SKU" value={variantForm.sku} onChange={e => setVariantForm({...variantForm, sku: e.target.value})} style={{width: '45%'}}/>
                <input placeholder="Price" type="number" value={variantForm.price} onChange={e => setVariantForm({...variantForm, price: e.target.value})} style={{width: '45%'}}/>
                <input placeholder="Stock" type="number" value={variantForm.stock} onChange={e => setVariantForm({...variantForm, stock: e.target.value})} style={{width: '45%'}}/>
                <button style={{width: '100%', padding: '10px', background: '#3498db', color: 'white', borderRadius: '5px', border: 'none'}} onClick={async () => {
                    if(!variantForm.name || !variantForm.price) return alert("Name and price required");
                    const res = await axios.post(`http://localhost:5000/api/products/${manageVariantsProduct.id}/variants`, variantForm, { headers: { Authorization: `Bearer ${token}` } });
                    fetchProducts();
                    setManageVariantsProduct({...manageVariantsProduct, variants: [...(manageVariantsProduct.variants||[]), res.data]});
                    setVariantForm({name: "", sku: "", price: "", stock: ""});
                }}>+ Add Variant</button>
            </div>
            <div className="modalActions" style={{marginTop:'15px'}}>
              <button onClick={() => { setManageVariantsProduct(null); setVariantForm({name: "", sku: "", price: "", stock: ""}); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {selectedProductView && (
        <div className="modal" onClick={() => setSelectedProductView(null)}>
          <div className="modalBox" style={{width: '700px', display: 'flex', gap: '20px', padding: '30px', maxWidth: '90vw'}} onClick={e => e.stopPropagation()}>
             <img src={selectedProductView.image || "https://via.placeholder.com/150"} alt={selectedProductView.name} style={{width: '300px', height: '300px', objectFit: 'cover', borderRadius: '10px'}} />
             <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                 <span style={{fontSize: '12px', background: '#eee', padding: '2px 5px', borderRadius: '3px', color: '#333', alignSelf: 'flex-start'}}>{selectedProductView.category}</span>
                 <h2 style={{margin: '10px 0'}}>{selectedProductView.name}</h2>
                 <p style={{color: '#666', fontSize: '16px', lineHeight: '1.5', flex: 1}}>{selectedProductView.description}</p>
                 
                 {selectedProductView.variants && selectedProductView.variants.length > 0 ? (
                    <div style={{marginBottom: '20px'}}>
                        <h4 style={{marginBottom: '10px'}}>Select Variant:</h4>
                        <select style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'4px', fontSize: '16px'}} value={variantSelections[selectedProductView.id] || ""} onChange={(e) => handleVariantChange(selectedProductView.id, e.target.value)}>
                          <option value="" disabled>-- Select a Variant --</option>
                          {selectedProductView.variants.map(v => (
                              <option key={v.id} value={v.id}>{v.name} - ₹{v.price} ({v.stock} left)</option>
                          ))}
                        </select>
                    </div>
                 ) : (
                    <h3 style={{color: '#2ecc71', marginBottom: '20px'}}>₹{selectedProductView.price} <span style={{fontSize:'14px', color: '#7f8c8d'}}>({selectedProductView.stock} in stock)</span></h3>
                 )}

                 <div style={{display: 'flex', gap: '10px', marginTop: 'auto'}}>
                     <button className="cartBtn" style={{flex: 2, padding: '15px', fontSize: '16px', background: '#27ae60'}} onClick={() => {
                         addToCart(selectedProductView);
                         if (selectedProductView.variants && selectedProductView.variants.length > 0 && !variantSelections[selectedProductView.id]) return;
                         setSelectedProductView(null);
                     }}>🛒 Add to Cart</button>
                     <button onClick={() => setSelectedProductView(null)} style={{flex: 1, padding: '15px', background: '#95a5a6', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer'}}>Cancel</button>
                 </div>
                 
                 {/* Admin Actions */}
                 <div style={{marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '10px'}}>
                    <button className="editBtn" onClick={() => { setManageVariantsProduct(selectedProductView); setSelectedProductView(null); }} style={{flex: 1}}> Vars </button>
                    <button className="editBtn" onClick={() => { setEditItem(selectedProductView); setPreview(selectedProductView.image); setSelectedProductView(null); }} style={{flex: 1}}> Edit </button>
                    <button className="deleteBtn" onClick={() => { deleteProduct(selectedProductView.id); setSelectedProductView(null); }} style={{flex: 1}}> Delete </button>
                 </div>
             </div>
          </div>
        </div>
      )}

      {showSavedCarts && (
        <div className="modal">
          <div className="modalBox" style={{width: '600px'}}>
             <h3 style={{color: '#333', marginBottom: '15px'}}>Saved / Held Carts</h3>
             <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                 {dbSavedCarts.length === 0 && <p style={{textAlign: 'center', color: '#666'}}>No carts currently on hold.</p>}
                 {dbSavedCarts.map(c => (
                     <div key={c.id} style={{padding: '15px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                         <div>
                             <strong>{c.name}</strong>
                             <div style={{fontSize: '12px', color: '#7f8c8d'}}>{new Date(c.created_at).toLocaleString()}</div>
                             <div style={{fontSize: '14px', color: '#e67e22', marginTop: '5px'}}>Items: {c.cart_data.cart?.length || 0}</div>
                         </div>
                         <button onClick={() => resumeCart(c)} style={{background: '#2ecc71', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>▶️ Recall</button>
                     </div>
                 ))}
             </div>
             <div className="modalActions" style={{marginTop: '20px'}}>
                <button onClick={() => setShowSavedCarts(false)}>Close</button>
             </div>
          </div>
        </div>
      )}

      {showPrintReceipt && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  #thermal-receipt, #thermal-receipt * { visibility: visible; }
                  #thermal-receipt { position: absolute; left: 0; top: 0; width: 80mm; padding: 0; margin: 0; }
                }
              `}
            </style>
            <div id="thermal-receipt" style={{background: 'white', width: '80mm', padding: '5mm', fontFamily: 'monospace', fontSize: '12px', color: 'black'}}>
                <h2 style={{textAlign: 'center', margin: '0 0 10px 0'}}>RETAIL POS</h2>
                <div style={{textAlign: 'center', marginBottom: '10px', fontSize: '10px'}}>
                   <div>123 Enterprise Blvd</div>
                   <div>Receipt #{showPrintReceipt.orderId}</div>
                   <div>{showPrintReceipt.date}</div>
                   {showPrintReceipt.customerName && <div>Customer: {showPrintReceipt.customerName}</div>}
                </div>
                <div style={{borderBottom: '1px dashed black', marginBottom: '10px'}}></div>
                <table style={{width: '100%', marginBottom: '10px'}}>
                   <tbody>
                      {showPrintReceipt.cart.map((item, idx) => (
                          <tr key={idx}>
                              <td>{item.qty}x {item.name} {item.variant ? `(${item.variant})` : ''}</td>
                              <td style={{textAlign: 'right'}}>{(item.price * item.qty).toFixed(2)}</td>
                          </tr>
                      ))}
                   </tbody>
                </table>
                <div style={{borderBottom: '1px dashed black', marginBottom: '10px'}}></div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Subtotal:</span> <span>{showPrintReceipt.subtotal.toFixed(2)}</span></div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Tax:</span> <span>{showPrintReceipt.taxTotal.toFixed(2)}</span></div>
                {showPrintReceipt.discountVal > 0 && <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Discount:</span> <span>-{showPrintReceipt.discountVal.toFixed(2)}</span></div>}
                <div style={{borderBottom: '1px solid black', margin: '5px 0'}}></div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px'}}><span>TOTAL:</span> <span>{showPrintReceipt.grandTotal.toFixed(2)}</span></div>
                <div style={{textAlign: 'center', marginTop: '20px', fontSize: '10px'}}>Thank you for shopping!</div>
            </div>
            
            <div style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
               <button onClick={() => window.print()} style={{padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer'}}>🖨️ Print Receipt</button>
               <button onClick={() => setShowPrintReceipt(null)} style={{padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer'}}>Close</button>
            </div>
        </div>
      )}

    </div>
  );
}

export default ProductPage;