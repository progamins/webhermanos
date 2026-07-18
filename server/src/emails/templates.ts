// ════════════════════════════════════════════════════════════════
// MAISON ROSAS — Email Templates
// Ported from the original server.ts Firebase implementation
// ════════════════════════════════════════════════════════════════

function getBarcodeSvg(code: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charMap: Record<string, string> = {};
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const pattern = i.toString(2).padStart(6, '0').replace(/0/g, '1').replace(/1/g, '2');
    charMap[c] = pattern;
  }

  let barSequence = '';
  for (const ch of code.toUpperCase()) {
    if (charMap[ch]) {
      barSequence += charMap[ch];
    } else {
      barSequence += '212121';
    }
  }

  const totalHeight = 40;
  const quietZone = 10;
  let bars = '';
  let x = quietZone;

  bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;
  bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`; x += 1;
  bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;
  bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`; x += 1;

  for (const ch of barSequence) {
    const w = ch === '2' ? 3 : 1;
    bars += `<rect x="${x}" y="0" width="${w}" height="${totalHeight}" fill="#27272a"/>`;
    x += w;
    bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`;
    x += 1;
  }

  bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;
  bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`; x += 1;
  bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;

  const totalWidth = x + quietZone;

  return `
    <svg width="${totalWidth}" height="${totalHeight + 20}" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
      ${bars}
      <text x="${totalWidth / 2}" y="${totalHeight + 16}" text-anchor="middle" font-family="monospace" font-size="11" fill="#8A5550" letter-spacing="2">${code}</text>
    </svg>
  `;
}

function emailHeader() {
  return `
    <div style="background-color: #FFF9F5; padding: 30px 20px; text-align: center; border-bottom: 2px solid #F0D6CE;">
      <h1 style="font-family: 'Spectral', Georgia, serif; font-size: 28px; color: #8A5550; margin: 0; font-style: italic; font-weight: normal; letter-spacing: 1px;">Maison Rosas</h1>
      <p style="font-family: 'Quicksand', Helvetica, Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #D4A373; margin: 8px 0 0 0; font-weight: bold;">Pastelería de Autor & Repostería Fina</p>
    </div>
  `;
}

function emailFooter() {
  return `
    <div style="background-color: #2D1C1A; padding: 30px 20px; text-align: center; color: #F8E3DE; border-top: 1px solid #6D4440; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
      <p style="font-family: 'Spectral', Georgia, serif; font-size: 16px; font-style: italic; margin: 0 0 10px 0;">Hecho a mano con amor familiar por Carol & Edwin.</p>
      <p style="font-family: 'Quicksand', sans-serif; font-size: 11px; color: #E4AAA0; margin: 0 0 5px 0; line-height: 1.5;">Av. Ricardo Palma 213, Urb. Sánchez Cerro, Sullana, Piura, Perú</p>
      <p style="font-family: 'Quicksand', sans-serif; font-size: 11px; color: #E4AAA0; margin: 0 0 15px 0;">WhatsApp: +51 902 568 187 | Email: edwinraulrosasalbines@gmail.com</p>
      <div style="border-top: 1px solid #6D4440; padding-top: 15px; font-size: 10px; color: #C4A8A0;">
        &copy; ${new Date().getFullYear()} Maison Rosas. Todos los derechos reservados.
      </div>
    </div>
  `;
}

export function getEmailTemplates() {
  return {
    confirmation(order: any) {
      return `
        <div style="font-family: 'Quicksand', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
          ${emailHeader()}
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="font-family: 'Spectral', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 15px 0; text-align: center; font-style: italic; font-weight: normal;">¡Tu Pedido ha sido Recibido!</h2>
            <p style="font-size: 14px; color: #8A5550; line-height: 1.6; text-align: center; margin: 0 0 25px 0;">
              Estimado/a <strong>${order.customerName}</strong>, Carol ya tiene tu solicitud de diseño personalizado en su taller. Hemos generado tu código de seguimiento exclusivo.
            </p>
            <div style="background-color: #FFF9F5; border: 1px dashed #E4AAA0; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
              <span style="font-size: 11px; font-family: monospace; text-transform: uppercase; color: #D4A373; letter-spacing: 0.15em; font-weight: bold; display: block; margin-bottom: 5px;">Código de Seguimiento</span>
              <strong style="font-size: 24px; font-family: monospace; color: #8A5550; letter-spacing: 2px;">${order.trackingCode}</strong>
              <span style="font-size: 11px; color: #C4A8A0; display: block; margin-top: 5px;">Número de pedido: ${order.id}</span>
              <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #E4AAA0;">
                ${getBarcodeSvg(`MR-${order.trackingCode}`)}
              </div>
            </div>
            <h3 style="font-family: 'Spectral', Georgia, serif; font-size: 18px; color: #523531; border-bottom: 1px solid #F0D6CE; padding-bottom: 8px; margin: 0 0 15px 0; font-weight: normal;">Detalles del Pastel de Autor</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #523531; margin-bottom: 25px;">
              <tr><td style="padding: 8px 0; color: #C4A8A0;">Modelo:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.productName}</td></tr>
              <tr><td style="padding: 8px 0; color: #C4A8A0;">Medida / Porciones:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.size}</td></tr>
              <tr><td style="padding: 8px 0; color: #C4A8A0;">Sabor:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.flavor}</td></tr>
              ${order.customColor ? `<tr><td style="padding: 8px 0; color: #C4A8A0;">Color:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.customColor}</td></tr>` : ''}
              <tr style="border-top: 1px solid #F0D6CE;">
                <td style="padding: 15px 0 8px 0; font-size: 15px; font-weight: bold; color: #523531;">Total:</td>
                <td style="padding: 15px 0 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #C4847D;">S/. ${order.totalPrice}</td>
              </tr>
            </table>
            <div style="text-align: center; margin-top: 30px;">
              <a href="/?trackingCode=${order.trackingCode}&email=${encodeURIComponent(order.customerEmail)}" style="display: inline-block; background-color: #C4847D; color: #ffffff; padding: 14px 28px; font-family: 'Quicksand', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 10px rgba(196, 132, 125, 0.25);">Consultar Estado del Pedido</a>
            </div>
          </div>
          ${emailFooter()}
        </div>
      `;
    },

    statusUpdate(order: any) {
      const statusColors: Record<string, string> = {
        Pendiente: '#D4A373', Confirmado: '#3B82F6', Preparando: '#8B5CF6',
        Decoración: '#EC4899', Listo: '#10B981', 'En camino': '#F59E0B',
        Entregado: '#16A34A', Cancelado: '#EF4444',
      };
      const statusText: Record<string, string> = {
        Pendiente: 'Pedido Recibido', Confirmado: 'Pedido Confirmado',
        Preparando: 'En Preparación', Decoración: 'Decoración Final',
        Listo: 'Listo para Recoger', 'En camino': 'En Camino',
        Entregado: 'Entregado con Éxito', Cancelado: 'Pedido Cancelado',
      };

      const color = statusColors[order.status] || '#C4847D';
      const label = statusText[order.status] || order.status;

      const messages: Record<string, string> = {
        Confirmado: '¡Excelentes noticias! Edwin y Carol han verificado tu diseño y confirmado tu pedido.',
        Preparando: '¡Manos a la obra! Carol ha comenzado a hornear tu bizcocho con ingredientes premium.',
        Decoración: '¡Llegó el arte! Carol está decorando tu pastel con cada detalle que seleccionaste.',
        Listo: order.deliveryType === 'recojo'
          ? '¡Tu obra de arte está lista! Ya puedes recogerla en nuestra sede.'
          : '¡Tu obra de arte está lista! Será enviada a tu domicilio.',
        'En camino': '¡Tu pastel va en camino! Nuestro repartidor lo transporta con el máximo cuidado.',
        Entregado: '¡Entregado con éxito! Esperamos que disfrutes esta obra maestra.',
        Cancelado: `Lamentamos informarte que tu pedido ha sido cancelado.${order.cancelReason ? ` Motivo: "${order.cancelReason}"` : ''}`,
      };

      const message = messages[order.status] || `El estado de tu pedido ha sido actualizado a: ${label}.`;

      return `
        <div style="font-family: 'Quicksand', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
          ${emailHeader()}
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="font-family: 'Spectral', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 10px 0; text-align: center; font-style: italic; font-weight: normal;">Actualización de tu Pedido</h2>
            <p style="font-size: 13px; color: #71717a; text-align: center; margin: 0 0 25px 0;">Pedido: <strong>#${order.id}</strong></p>
            <div style="text-align: center; margin-bottom: 35px;">
              <span style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 8px 18px; font-family: 'Quicksand', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 30px;">${label}</span>
            </div>
            <p style="font-size: 14px; color: #8A5550; line-height: 1.6; text-align: center; margin: 0 0 30px 0;">${message}</p>
            <div style="background-color: #FFF9F5; border: 1px solid #F0D6CE; border-radius: 12px; padding: 20px;">
              <p style="font-size: 12px; color: #8A5550; margin: 0 0 5px 0;"><strong>Modelo:</strong> ${order.productName}</p>
              <p style="font-size: 12px; color: #8A5550; margin: 0 0 5px 0;"><strong>Código:</strong> ${order.trackingCode}</p>
              <p style="font-size: 12px; color: #8A5550; margin: 0;"><strong>Entrega:</strong> ${order.deliveryDate} a las ${order.deliveryTime}</p>
              <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #F0D6CE;">
                ${getBarcodeSvg(`MR-${order.trackingCode}`)}
              </div>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="/?trackingCode=${order.trackingCode}&email=${encodeURIComponent(order.customerEmail)}" style="display: inline-block; background-color: #C4847D; color: #ffffff; padding: 14px 28px; font-family: 'Quicksand', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 8px;">Ver Progreso</a>
            </div>
          </div>
          ${emailFooter()}
        </div>
      `;
    },

    contact(name: string, email: string | undefined, message: string) {
      return `
        <div style="font-family: 'Quicksand', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
          ${emailHeader()}
          <div style="padding: 30px;">
            <h2 style="font-family: 'Spectral', Georgia, serif; font-size: 20px; color: #523531; margin: 0 0 15px 0; font-weight: normal;">Nuevo mensaje de contacto</h2>
            <p style="font-size: 13px; color: #8A5550; line-height: 1.6;">Has recibido un nuevo mensaje desde la web Maison Rosas.</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0;">
              <tr><td style="padding: 8px 0; color: #C4A8A0; width: 100px;">Nombre:</td><td style="padding: 8px 0; font-weight: bold; color: #8A5550;">${name}</td></tr>
              ${email ? `<tr><td style="padding: 8px 0; color: #C4A8A0;">Email:</td><td style="padding: 8px 0; font-weight: bold; color: #8A5550;">${email}</td></tr>` : ''}
            </table>
            <div style="background-color: #FFF9F5; border: 1px solid #F0D6CE; border-radius: 12px; padding: 20px;">
              <p style="font-size: 13px; color: #8A5550; margin: 0 0 10px 0; font-weight: bold;">Mensaje:</p>
              <p style="font-size: 13px; color: #8A5550; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          ${emailFooter()}
        </div>
      `;
    },

    otp(customerName: string, email: string, otp: string, orders?: any[]) {
      const orderRows = orders && orders.length > 0
        ? orders.map(o => `
            <tr style="border-bottom: 1px solid #F0D6CE;">
              <td style="padding: 10px 8px; font-size: 12px; color: #8A5550;">${o.productName || 'Pastel'}</td>
              <td style="padding: 10px 8px; font-size: 12px; color: #8A5550;">S/. ${o.totalPrice || '—'}</td>
              <td style="padding: 10px 8px; font-size: 12px;"><span style="display: inline-block; background-color: #C4847D; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 9px; font-weight: bold; text-transform: uppercase;">${o.status || '—'}</span></td>
              <td style="padding: 10px 8px; font-size: 11px; font-family: monospace; color: #C4A8A0;">${o.trackingCode || '—'}</td>
            </tr>
          `).join('')
        : '';

      const orderSection = orders && orders.length > 0 ? `
        <h3 style="font-family: 'Spectral', Georgia, serif; font-size: 16px; color: #523531; margin: 25px 0 10px 0; font-weight: normal;">📋 Tus Pedidos</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #F0D6CE; margin-bottom: 25px;">
          <thead><tr style="background-color: #FFF9F5;">
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; color: #8A5550; text-align: left;">Pastel</th>
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; color: #8A5550; text-align: left;">Total</th>
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; color: #8A5550; text-align: left;">Estado</th>
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; color: #8A5550; text-align: left;">Código</th>
          </tr></thead>
          <tbody>${orderRows}</tbody>
        </table>` : '';

      return `
        <div style="font-family: 'Quicksand', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
          ${emailHeader()}
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="font-family: 'Spectral', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 20px 0; text-align: center; font-style: italic; font-weight: normal;">🔐 Acceso a tus Pedidos</h2>
            <p style="font-size: 14px; color: #8A5550; line-height: 1.6;">Hola, <strong>${customerName}</strong>.</p>
            <p style="font-size: 14px; color: #8A5550; line-height: 1.6;">Has solicitado acceso a tus pedidos. Ingresa este código:</p>
            <div style="background-color: #FFF9F5; border: 1px dashed #C4847D; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
              <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #D4A373; letter-spacing: 0.2em; display: block; margin-bottom: 10px;">Código de Verificación</span>
              <strong style="font-size: 38px; font-family: monospace; color: #C4847D; letter-spacing: 5px;">${otp}</strong>
              <span style="font-size: 11px; color: #C4A8A0; display: block; margin-top: 10px;">Válido por 10 minutos.</span>
            </div>
            ${orderSection}
            <p style="font-size: 13px; color: #C4A8A0; text-align: center;">Si no solicitaste este código, ignora este correo.</p>
          </div>
          ${emailFooter()}
        </div>
      `;
    },

    credentials(passwords: { admin: string; analyst: string; stock_manager: string }, configInfo?: any) {
      return `
        <div style="font-family: 'Quicksand', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
          <div style="background-color: #2D1C1A; padding: 30px 20px; text-align: center;">
            <h1 style="font-family: 'Spectral', Georgia, serif; font-size: 28px; color: #F8E3DE; margin: 0; font-style: italic; font-weight: normal; letter-spacing: 1px;">Maison Rosas</h1>
            <p style="font-family: 'Quicksand', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #D4A373; margin: 8px 0 0 0; font-weight: bold;">Panel de Administración</p>
          </div>
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="font-family: 'Spectral', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 15px 0; text-align: center; font-style: italic; font-weight: normal;">🔐 Credenciales de Acceso</h2>
            <p style="font-size: 14px; color: #8A5550; line-height: 1.6; text-align: center; margin: 0 0 25px 0;">Estas son las credenciales configuradas para el panel de administración.</p>
            <div style="background-color: #FFF9F5; border: 1px solid #F0D6CE; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr style="border-bottom: 1px solid #F0D6CE;">
                  <td style="padding: 12px 8px; font-weight: bold; color: #8A5550;">🛡️ Admin</td>
                  <td style="padding: 12px 8px; text-align: right;"><code style="background: #2D1C1A; color: #F8E3DE; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${passwords.admin}</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #F0D6CE;">
                  <td style="padding: 12px 8px; font-weight: bold; color: #8A5550;">👤 Analista</td>
                  <td style="padding: 12px 8px; text-align: right;"><code style="background: #2D1C1A; color: #F8E3DE; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${passwords.analyst}</code></td>
                </tr>
                <tr>
                  <td style="padding: 12px 8px; font-weight: bold; color: #8A5550;">🖼️ Stock</td>
                  <td style="padding: 12px 8px; text-align: right;"><code style="background: #2D1C1A; color: #F8E3DE; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${passwords.stock_manager}</code></td>
                </tr>
              </table>
            </div>
            <p style="font-family: 'Quicksand', sans-serif; font-size: 11px; color: #C4A8A0; text-align: center;">⚠️ No compartas estas credenciales.</p>
          </div>
          ${emailFooter()}
        </div>
      `;
    },
  };
}
