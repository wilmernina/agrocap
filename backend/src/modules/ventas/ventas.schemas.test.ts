import test from 'node:test'; import assert from 'node:assert/strict'; import { crearVentaSchema, pagoVentaSchema } from './ventas.schemas.ts';
const id='123e4567-e89b-42d3-a456-426614174000';
test('rechaza descuento de línea superior a su importe',()=>{assert.equal(crearVentaSchema.safeParse({almacenId:id,items:[{productoId:id,cantidad:1,precioUnitario:10,descuento:11}]}).success,false);});
test('un pago debe ser positivo y usar un método admitido',()=>{assert.equal(pagoVentaSchema.safeParse({monto:100,metodoPago:'qr'}).success,true);assert.equal(pagoVentaSchema.safeParse({monto:0,metodoPago:'efectivo'}).success,false);});
