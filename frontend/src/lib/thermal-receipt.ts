export type ThermalReceiptItem = {
  sku: string;
  name: string;
  quantity: string | number;
  price: string | number;
  subtotal: string | number;
  discount?: string | number;
  lot?: string | null;
};

export type ThermalReceiptData = {
  type: 'VENTA' | 'COMPRA';
  number: string;
  date: string;
  status: string;
  partyLabel: 'Cliente' | 'Proveedor';
  party: string;
  warehouse: string;
  items: ThermalReceiptItem[];
  subtotal: string | number;
  discount?: string | number;
  taxes: string | number;
  total: string | number;
  paid?: string | number;
  balance?: string | number;
  observations?: string | null;
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

const money = (value: string | number | undefined) => new Intl.NumberFormat('es-BO', {
  style: 'currency', currency: 'BOB', minimumFractionDigits: 2,
}).format(Number(value ?? 0));

const quantity = (value: string | number) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: 3 }).format(Number(value));

export function printThermalReceipt(data: ThermalReceiptData) {
  const printWindow = window.open('', '_blank', 'width=420,height=720');
  if (!printWindow) {
    window.alert('Permite las ventanas emergentes para imprimir el comprobante.');
    return;
  }

  const items = data.items.map((item) => `
    <section class="item">
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml(item.sku)}${item.lot ? ` · Lote ${escapeHtml(item.lot)}` : ''}</small>
      <div class="row"><span>${quantity(item.quantity)} × ${money(item.price)}</span><b>${money(item.subtotal)}</b></div>
      ${Number(item.discount ?? 0) > 0 ? `<div class="row"><small>Descuento de línea</small><small>−${money(item.discount)}</small></div>` : ''}
    </section>`).join('');
  const discount = Number(data.discount ?? 0);
  const paid = data.paid === undefined ? null : Number(data.paid);
  const balance = data.balance === undefined ? null : Number(data.balance);

  printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Comprobante ${escapeHtml(data.number)}</title>
    <style>
      @page{size:80mm auto;margin:3mm}
      *{box-sizing:border-box}body{width:72mm;margin:0 auto;color:#111;font:12px/1.35 Arial,sans-serif}
      h1,h2,p{margin:0}header{text-align:center;padding:4px 0 10px;border-bottom:1px dashed #555}
      h1{font-size:20px;letter-spacing:.5px}header p{margin-top:3px;font-size:10px}
      h2{margin:10px 0 3px;text-align:center;font-size:14px}.meta{padding:8px 0;border-bottom:1px dashed #555}
      .row{display:flex;justify-content:space-between;gap:8px}.meta .row{margin:2px 0}.item{padding:7px 0;border-bottom:1px dashed #aaa}
      .item strong,.item small{display:block}.item small{margin:2px 0;color:#444;font-size:10px}.item .row{margin-top:3px}
      .totals{padding:8px 0;border-bottom:1px dashed #555}.totals .row{margin:3px 0}.grand{font-size:16px;font-weight:bold;margin-top:6px;padding-top:5px;border-top:1px solid #111}
      .note{padding:8px 0;font-size:10px;white-space:pre-wrap}footer{padding:10px 0;text-align:center;font-size:10px}
      .status{font-weight:bold;text-transform:uppercase}.actions{position:fixed;top:8px;right:8px}
      @media print{.actions{display:none}body{width:100%}}
    </style></head><body>
      <div class="actions"><button onclick="window.print()">Imprimir</button></div>
      <header><h1>AgroCAP</h1><p>COMPROBANTE INTERNO</p></header>
      <h2>COMPROBANTE DE ${escapeHtml(data.type)}</h2>
      <div class="meta">
        <div class="row"><span>N.º:</span><b>${escapeHtml(data.number)}</b></div>
        <div class="row"><span>Fecha:</span><span>${escapeHtml(new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date(data.date)))}</span></div>
        <div class="row"><span>Estado:</span><span class="status">${escapeHtml(data.status)}</span></div>
        <div class="row"><span>${escapeHtml(data.partyLabel)}:</span><span>${escapeHtml(data.party)}</span></div>
        <div class="row"><span>Almacén:</span><span>${escapeHtml(data.warehouse)}</span></div>
      </div>
      ${items || '<p class="note">Sin productos</p>'}
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${money(data.subtotal)}</span></div>
        ${discount ? `<div class="row"><span>Descuento</span><span>−${money(discount)}</span></div>` : ''}
        ${Number(data.taxes) ? `<div class="row"><span>Impuestos</span><span>${money(data.taxes)}</span></div>` : ''}
        <div class="row grand"><span>TOTAL</span><span>${money(data.total)}</span></div>
        ${paid !== null ? `<div class="row"><span>Pagado</span><span>${money(paid)}</span></div>` : ''}
        ${balance !== null ? `<div class="row"><span>Saldo</span><span>${money(balance)}</span></div>` : ''}
      </div>
      ${data.observations ? `<p class="note"><b>Observaciones:</b> ${escapeHtml(data.observations)}</p>` : ''}
      <footer>Gracias por su preferencia.<br>AgroCAP</footer>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
    </body></html>`);
  printWindow.document.close();
}
