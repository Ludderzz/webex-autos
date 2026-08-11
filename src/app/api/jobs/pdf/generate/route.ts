import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      jobId, 
      registration, 
      completedAt, 
      summary, 
      imageCount, 
      docType = 'report', // 'report' or 'invoice'
      price, 
      isPaid,
      parts = [] 
    } = data;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {}
          },
        },
      }
    );

    // Fetch the actual garage name and ensure robust extraction
    let garageName = 'WORKSHOP BAY';
    
    if (jobId) {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          garage_id,
          garages (
            name
          )
        `)
        .eq('id', jobId)
        .single();

      if (!jobError && jobData) {
        const rawGarage = jobData.garages;
        const garageInfo = Array.isArray(rawGarage) ? rawGarage[0] : rawGarage;

        if (garageInfo?.name) {
          garageName = garageInfo.name;
        }
      }
    }

    // Fallback: If job lookup didn't give a name, check current authenticated user's profile garage
    if (garageName === 'WORKSHOP BAY') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('garages(name)')
          .eq('id', user.id)
          .single();

        const profileGarage = Array.isArray(profile?.garages) ? profile?.garages[0] : profile?.garages;
        if (profileGarage?.name) {
          garageName = profileGarage.name;
        }
      }
    }

    const isInvoice = docType === 'invoice';
    
    // Calculate total parts cost/retail or use provided price fallback
    const calculatedPartsTotal = parts.reduce((acc: number, p: any) => {
      const itemPrice = p.retail_price ?? p.retailPrice ?? p.cost_price ?? p.costPrice ?? 0;
      return acc + (Number(itemPrice) * (p.quantity || 1));
    }, 0);

    const finalPrice = price ? parseFloat(price) : calculatedPartsTotal;
    const formattedPrice = !isNaN(finalPrice) && finalPrice > 0 ? `£${finalPrice.toFixed(2)}` : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${isInvoice ? 'Invoice' : 'Job Report'} - ${registration || 'Vehicle'}</title>
        <style>
          @page { size: A4; margin: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #ffffff;
            color: #111111;
            margin: 0;
            padding: 40px;
            -webkit-print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #000000;
            text-transform: uppercase;
          }
          .badge {
            background-color: #f59e0b;
            color: #000000;
            font-weight: 700;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            text-transform: uppercase;
          }
          .badge-paid {
            background-color: #10b981;
            color: #ffffff;
          }
          .badge-unpaid {
            background-color: #ef4444;
            color: #ffffff;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .card {
            background-color: #f9f9fb;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            padding: 16px;
          }
          .card-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #71717a;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            font-weight: 600;
          }
          .card-value {
            font-size: 18px;
            font-weight: 700;
            color: #09090b;
          }
          .section {
            background-color: #f9f9fb;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .section-heading {
            font-size: 14px;
            font-weight: 700;
            color: #d97706;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .summary-text {
            font-size: 14px;
            color: #27272a;
            line-height: 1.6;
            white-space: pre-wrap;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .table th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            color: #71717a;
            border-bottom: 1px solid #e5e5e7;
            padding-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .table td {
            font-size: 13px;
            padding: 10px 0;
            border-bottom: 1px solid #e5e5e7;
            color: #27272a;
          }
          .table td.num, .table th.num {
            text-align: right;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #71717a;
            border-top: 1px solid #e5e5e7;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">${garageName}</div>
          <div class="badge ${isInvoice ? (isPaid ? 'badge-paid' : 'badge-unpaid') : ''}">
            ${isInvoice ? (isPaid ? 'Invoice • Paid' : 'Invoice • Unpaid / Due') : 'Job Completed'}
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Registration Plate</div>
            <div class="card-value" style="font-family: monospace; letter-spacing: 1px;">${registration || 'N/A'}</div>
          </div>
          <div class="card">
            <div class="card-title">Reference ID</div>
            <div class="card-value" style="font-family: monospace;">#${jobId ? jobId.slice(0, 8) : 'N/A'}</div>
          </div>
          <div class="card">
            <div class="card-title">${isInvoice ? 'Invoice Date' : 'Completion Date'}</div>
            <div class="card-value">${completedAt ? new Date(completedAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
          </div>
          <div class="card">
            <div class="card-title">Media Attached</div>
            <div class="card-value">${imageCount || 0} Photos</div>
          </div>
          ${formattedPrice ? `
          <div class="card" style="grid-column: span 2; border-color: #f59e0b66; background-color: #fffbeb;">
            <div class="card-title" style="color: #d97706;">Total Price Amount</div>
            <div class="card-value" style="font-size: 24px; color: #b45309;">${formattedPrice}</div>
          </div>
          ` : ''}
        </div>

        ${isInvoice && parts.length > 0 ? `
        <div class="section">
          <div class="section-heading">Parts & Components Itemization</div>
          <table class="table">
            <thead>
              <tr>
                <th>Part Description</th>
                <th class="num">Qty</th>
                <th class="num">Unit Price</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              ${parts.map((part: any) => {
                const unitPrice = part.retail_price ?? part.retailPrice ?? part.cost_price ?? part.costPrice ?? 0;
                const qty = part.quantity || 1;
                const total = Number(unitPrice) * Number(qty);
                return `
                  <tr>
                    <td>${part.name || 'Workshop Component'}</td>
                    <td class="num">${qty}</td>
                    <td class="num">£${Number(unitPrice).toFixed(2)}</td>
                    <td class="num">£${Number(total).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-heading">${isInvoice ? 'Invoice Notes & Observations' : 'Technician & Work Summary'}</div>
          <div class="summary-text">${summary || 'Standard vehicle servicing and inspection completed.'}</div>
        </div>

        <div class="footer">
          Official ${isInvoice ? 'Tax Invoice' : 'Work Summary'} • Generated by ${garageName}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename=${docType}-${registration || 'job'}.html`,
      },
    });

  } catch (err: any) {
    console.error('Error generating PDF report:', err);
    return NextResponse.json(
      { error: 'Failed to generate report PDF', details: err?.message },
      { status: 500 }
    );
  }
}