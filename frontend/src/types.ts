export type User={id:string;name:string;email:string;role:string;organizationId:string};
export type Product={id:string;sku:string;name:string;description?:string;type:'product'|'service';salePrice:string;costPrice:string;minStock:string;stock:string;unitId:string;categoryId?:string;unit:string;category?:string;active:boolean};
export type Customer={id:string;document?:string;name:string;phone?:string;email?:string;address?:string;active:boolean};
export type Warehouse={id:string;name:string;code:string}; export type Unit={id:string;name:string;symbol:string}; export type Category={id:string;name:string};
export type Sale={id:string;number:string;soldAt:string;status:'draft'|'confirmed'|'cancelled';total:string;paid:string;customer?:string;warehouse:string};
export type Entry={id:string;number:string;receivedAt:string;source:string;reference?:string;status:string;warehouse:string};
export type Stock={productId:string;sku:string;product:string;unit:string;warehouseId:string;warehouse:string;quantity:string;minStock:string;updatedAt:string};
