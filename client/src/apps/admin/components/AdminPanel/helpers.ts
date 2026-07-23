import { Order } from '../../../../shared/types';

export function getMonthlyOrderData(orders: Order[]) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const counts: Record<string, number> = {};
  const sales: Record<string, number> = {};
  const currentYear = new Date().getFullYear();

  for (let m = 0; m < 12; m++) {
    const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
    counts[key] = 0;
    sales[key] = 0;
  }

  orders.forEach(o => {
    if (!o.date) return;
    const parts = o.date.split('-');
    if (parts.length >= 2) {
      const yr = parts[0];
      const mo = parts[1];
      const key = `${yr}-${mo}`;
      if (counts[key] !== undefined) {
        counts[key] = (counts[key] || 0) + 1;
        if (o.status === 'Entregado') {
          sales[key] = (sales[key] || 0) + o.totalPrice;
        }
      } else {
        counts[key] = 1;
        sales[key] = o.status === 'Entregado' ? o.totalPrice : 0;
      }
    }
  });

  return Object.keys(counts).sort().map(key => {
    const [yr, mo] = key.split('-');
    const monthIndex = parseInt(mo, 10) - 1;
    const monthName = months[monthIndex] || mo;
    return {
      month: `${monthName} ${yr.substring(2)}`,
      "Pedidos": counts[key],
      "Ventas": sales[key],
      key
    };
  });
}

export function generateTrackingCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function exportOrdersToExcel(filteredOrdersList: Order[]) {
  const totalSales = filteredOrdersList.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
  const totalPaid = filteredOrdersList.reduce((acc, o) => acc + (o.montoPagado || 0), 0);

  const columnsConfig = [
    { label: 'Pedido ID', width: '130px' },
    { label: 'Fecha Registro', width: '100px' },
    { label: 'Cliente', width: '150px' },
    { label: 'Celular', width: '100px' },
    { label: 'Correo Electrónico', width: '160px' },
    { label: 'Celebrado / Edad', width: '140px' },
    { label: 'Modelo Pastel', width: '160px' },
    { label: 'Sabor', width: '130px' },
    { label: 'Tamaño', width: '140px' },
    { label: 'Color', width: '100px' },
    { label: 'Decoración', width: '150px' },
    { label: 'Mensaje de Azúcar', width: '200px' },
    { label: 'Método Pago', width: '110px' },
    { label: 'Estado Pago', width: '110px' },
    { label: 'Monto Pagado', width: '115px' },
    { label: 'Tipo Entrega', width: '100px' },
    { label: 'Fecha Entrega', width: '110px' },
    { label: 'Hora Entrega', width: '90px' },
    { label: 'Dirección Entrega', width: '220px' },
    { label: 'Notas / Indicaciones', width: '250px' },
    { label: 'Origen de Fabricación', width: '180px' },
    { label: 'Precio Total', width: '115px' },
    { label: 'Estado Pedido', width: '115px' }
  ];

  const totalColumns = columnsConfig.length;

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Maison Rosas Pedidos</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; }
        td, th { border: 1px solid #e4e4e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; color: #3f3f46; }
        th { background-color: #be185d; color: #ffffff; font-weight: bold; font-size: 11px; text-transform: uppercase; border: 1px solid #9d174d; height: 32px; text-align: center; }
        .title-row { font-family: 'Georgia', serif; font-size: 18px; font-weight: bold; color: #be185d; height: 35px; }
        .subtitle-row { font-size: 10px; color: #71717a; font-style: italic; height: 20px; }
        .meta-label { font-weight: bold; color: #4b5563; font-size: 10px; background-color: #f9fafb; }
        .meta-value { color: #1f2937; font-size: 10px; background-color: #f9fafb; }
        .row-even { background-color: #fdf2f8; }
        .row-odd { background-color: #ffffff; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .mono { font-family: 'Consolas', 'Courier New', monospace; mso-number-format: "\\\\@"; }
        .price-cell { text-align: right; font-weight: bold; color: #0f172a; mso-number-format: '"S/."\\\\ #\\\\,\\\\#\\\\#0\\\\.00'; }
        .status-badge { font-weight: bold; text-align: center; border-radius: 4px; }
        .status-pendiente { background-color: #fef3c7; color: #92400e; }
        .status-confirmado { background-color: #e0f2fe; color: #0369a1; }
        .status-preparando { background-color: #dbeafe; color: #1e40af; }
        .status-decoracion { background-color: #fae8ff; color: #86198f; }
        .status-listo { background-color: #d1fae5; color: #065f46; }
        .status-en_camino { background-color: #f3e8ff; color: #581c87; }
        .status-entregado { background-color: #e0e7ff; color: #3730a3; }
        .status-cancelado { background-color: #fee2e2; color: #991b1b; }
        .pay-pendiente { background-color: #fef3c7; color: #92400e; }
        .pay-confirmado { background-color: #d1fae5; color: #065f46; }
        .pay-rechazado { background-color: #fee2e2; color: #991b1b; }
        .pay-parcial { background-color: #ffedd5; color: #9a3412; }
        .stock-origin { background-color: #ecfdf5; color: #047857; font-weight: bold; }
        .standard-origin { background-color: #f3f4f6; color: #4b5563; }
        .totals-row { background-color: #f1f5f9; border-top: 2px solid #be185d; font-weight: bold; height: 30px; }
      </style>
    </head>
    <body>
      <table>
        <colgroup>
          ${columnsConfig.map(col => `<col style="width: ${col.width};" />`).join('')}
        </colgroup>
        <tr>
          <td colspan="${totalColumns}" class="title-row text-left">MAISON ROSAS • PASTELERÍA BOUTIQUE</td>
        </tr>
        <tr>
          <td colspan="${totalColumns}" class="subtitle-row text-left">Planilla Inteligente de Control, Logística e Inventario</td>
        </tr>
        <tr>
          <td colspan="3" class="meta-label">Fecha de Reporte:</td>
          <td colspan="4" class="meta-value">${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</td>
          <td colspan="3" class="meta-label">Total Pedidos Exportados:</td>
          <td colspan="4" class="meta-value font-bold">${filteredOrdersList.length} pedidos</td>
          <td colspan="3" class="meta-label">Total Ingresos Totales:</td>
          <td colspan="5" class="meta-value font-bold" style="color: #be185d;">S/. ${totalSales.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" class="meta-label">Exportado por:</td>
          <td colspan="4" class="meta-value">Maison Admin System</td>
          <td colspan="3" class="meta-label">Monto Total Cobrado:</td>
          <td colspan="4" class="meta-value font-bold" style="color: #047857;">S/. ${totalPaid.toFixed(2)}</td>
          <td colspan="3" class="meta-label">Monto Pendiente Cobro:</td>
          <td colspan="5" class="meta-value font-bold" style="color: #b45309;">S/. ${(totalSales - totalPaid).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="${totalColumns}" style="height: 15px;"></td>
        </tr>
        <tr>
          ${columnsConfig.map(col => `<th>${col.label}</th>`).join('')}
        </tr>
        ${filteredOrdersList.map((o, idx) => {
          const isEven = idx % 2 === 0;
          const rowClass = isEven ? 'row-even' : 'row-odd';
          const statusClass = `status-${(o.status || 'pendiente').toLowerCase().replace(' ', '_')}`;
          const payStatusClass = `pay-${(o.paymentStatus || 'pendiente').toLowerCase()}`;
          const celebratedDetail = o.celebratedName ? `${o.celebratedName} ${o.customerAge ? `(${o.customerAge} años)` : ''}` : (o.customerAge ? `${o.customerAge} años` : '-');
          const originClass = o.fulfilledFromStock ? 'stock-origin' : 'standard-origin';
          const originText = o.fulfilledFromStock ? 'Vitrina / Stock Físico' : 'Elaboración Fábrica';
          return `
            <tr class="${rowClass}">
              <td class="mono text-left">${o.id}</td>
              <td class="text-center">${o.date || ''}</td>
              <td class="text-left font-bold" style="color: #1e293b;">${o.customerName || ''}</td>
              <td class="mono text-center">${o.customerPhone || ''}</td>
              <td class="text-left">${o.customerEmail || ''}</td>
              <td class="text-left">${celebratedDetail}</td>
              <td class="text-left font-bold" style="color: #be185d;">${o.productName || ''}</td>
              <td class="text-left">${o.flavor || ''}</td>
              <td class="text-left">${o.size || ''}</td>
              <td class="text-left">${o.customColor || '-'}</td>
              <td class="text-left">${o.selectedDecoration || ''}</td>
              <td class="text-left" style="font-style: italic;">${o.message ? `"${o.message.replace(/"/g, '&quot;')}"` : '-'}</td>
              <td class="text-center font-bold">${o.paymentMethod || 'Ninguno'}</td>
              <td class="text-center"><span class="status-badge ${payStatusClass}">${(o.paymentStatus || 'pendiente').toUpperCase()}</span></td>
              <td class="price-cell">${o.montoPagado || 0}</td>
              <td class="text-center font-bold" style="text-transform: uppercase;">${o.deliveryType === 'recojo' ? '📦 RECOJO' : '🚚 DOMICILIO'}</td>
              <td class="text-center">${o.deliveryDate || '-'}</td>
              <td class="text-center">${o.deliveryTime || '-'}</td>
              <td class="text-left">${o.deliveryAddress || '-'}</td>
              <td class="text-left" style="color: #6b7280; font-size: 10px;">${o.specialNotes || '-'}</td>
              <td class="text-center"><span class="status-badge ${originClass}">${originText}</span></td>
              <td class="price-cell">${o.totalPrice || 0}</td>
              <td class="text-center"><span class="status-badge ${statusClass}">${(o.status || 'Pendiente').toUpperCase()}</span></td>
            </tr>
          `;
        }).join('')}
        <tr class="totals-row">
          <td colspan="14" class="text-right font-bold" style="padding-right: 15px;">TOTAL DE LA PLANILLA:</td>
          <td class="price-cell" style="background-color: #f1f5f9; border-top: 2px solid #be185d;">${totalPaid}</td>
          <td colspan="6" class="text-right font-bold">SUMATORIA VENTAS:</td>
          <td class="price-cell" style="background-color: #fdf2f8; border-top: 2px solid #be185d; color: #be185d;">${totalSales}</td>
          <td style="background-color: #f1f5f9;"></td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `maison_rosas_planilla_ventas_${new Date().toISOString().split('T')[0]}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
