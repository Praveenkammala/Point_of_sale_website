import React, { useState } from "react";

export default function ProductGrid(){
  const products = [
    {id:1,name:"Bag",price:500},
    {id:2,name:"Shirt",price:700}
  ];

  const [cart,setCart]=useState([]);

  const add=(p)=>setCart([...cart,p]);

  const total = cart.reduce((s,i)=>s+i.price,0);

  return (
    <div>
      <h1>POS</h1>
      {products.map(p=>(
        <div key={p.id}>
          {p.name} - {p.price}
          <button onClick={()=>add(p)}>Add</button>
        </div>
      ))}
      <h2>Total: {total}</h2>
    </div>
  );
}
