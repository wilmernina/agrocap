import test from 'node:test'; import assert from 'node:assert/strict'; import { quantitySchema } from './schemas.ts'; import { saleSchema } from '../modules/sales/sales.schemas.ts';
test('quantity accepts up to three decimals',()=>{assert.equal(quantitySchema.parse('12.345'),12.345);assert.throws(()=>quantitySchema.parse('1.2345'));});
test('sale rejects duplicate products',()=>{const id='123e4567-e89b-42d3-a456-426614174000';assert.equal(saleSchema.safeParse({warehouseId:id,items:[{productId:id,quantity:1,unitPrice:10},{productId:id,quantity:2,unitPrice:10}]}).success,false);});
