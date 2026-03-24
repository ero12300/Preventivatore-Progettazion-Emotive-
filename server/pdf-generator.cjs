const puppeteer = require('puppeteer');

function isMeaningfulProjectDescription(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (text.length < 35) return false;

  const normalized = text.toLowerCase();
  const genericPatterns = [
    'test completo',
    'invio email',
    'pdf',
    'relazione ai',
    'prova invio',
    'test cliente',
  ];

  return !genericPatterns.some((pattern) => normalized.includes(pattern));
}

/**
 * Genera email HTML compatibile Gmail (solo tabelle, no CSS moderno)
 */
function generateQuoteHTML(data) {
  const {
    clientName,
    companyName,
    vatNumber,
    address,
    businessType,
    location,
    squareMeters,
    projectDescription,
    conceptReport,
    totalPrice = 2490,
    depositPercentage = 30,
    depositTotal,
    remainingTotal,
    iban = 'IT69J3609201600991466031460',
    stripeUrl = '',
    whatsappUrl = 'https://wa.me/393452275483',
    websiteEmotive = 'https://www.emotivedesign.it',
    websiteBoncordo = 'https://www.boncordoarredi.it',
    calendarUrl = 'https://calendly.com/emotivegroup',
    phoneNumber = '+39 345 227 5483'
  } = data;

  const quoteId = `EM${Date.now().toString().slice(-8)}`;
  
  // Calcola prezzo originale (+50%)
  const originalPrice = totalPrice * 1.5;
  const discountAmount = totalPrice * 0.5;
  const discountPercentage = 33;
  
  // Sezione descrizione progetto (opzionale)
  const projectDescriptionSection = isMeaningfulProjectDescription(projectDescription)
    ? `
    <table width="100%" cellpadding="20" cellspacing="0" border="0" bgcolor="#fffbf0" style="margin: 30px 0; border-left: 6px solid #d4af37; border-radius: 0 8px 8px 0;">
      <tr>
        <td>
          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
            📋 Brief Progetto
          </font>
          <br><br>
          <font face="Arial, sans-serif" size="2" color="#666666" style="line-height: 1.8; font-style: italic;">
            ${projectDescription.replace(/\n/g, '<br>')}
          </font>
        </td>
      </tr>
    </table>
    `
    : '';

  const generatedConceptReport = conceptReport || `
    Per ${businessType || 'la tua attivita'} in ${location || 'localita da definire'}${squareMeters ? `, su ${squareMeters} m²` : ''}, il Protocollo EMOTIVE trasforma lo spazio in un messaggio premium chiaro e distintivo.
    Il valore sta nell unire impatto estetico, funzionalita operativa e coerenza di posizionamento, con attenzione ai punti critici della tipologia per evitare dispersioni.
    Marketing e progetto devono restare allineati per rafforzare percezione, fiducia e conversione.
    Se condividi questa direzione, conferma ora l avvio del Protocollo EMOTIVE e procediamo con le fasi progettuali.
  `.replace(/\s+/g, ' ').trim();

  const conceptReportSection = `
    <table width="100%" cellpadding="20" cellspacing="0" border="0" bgcolor="#f5f8ff" style="margin: 30px 0; border-left: 6px solid #1d4ed8; border-radius: 0 8px 8px 0;">
      <tr>
        <td>
          <font face="Arial, sans-serif" size="2" color="#1d4ed8" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
            Relazione Concept
          </font>
          <br><br>
          <font face="Arial, sans-serif" size="2" color="#334155" style="line-height: 1.8;">
            ${generatedConceptReport}
          </font>
        </td>
      </tr>
    </table>
  `;

  // Informazioni cliente aggiuntive
  const clientDetails = `
    ${companyName ? `<font face="Arial, sans-serif" size="2" color="#666666"><strong>Azienda:</strong> ${companyName}</font><br>` : ''}
    ${vatNumber ? `<font face="Arial, sans-serif" size="2" color="#666666"><strong>P. IVA:</strong> ${vatNumber}</font><br>` : ''}
    ${address ? `<font face="Arial, sans-serif" size="2" color="#666666"><strong>Indirizzo:</strong> ${address}</font><br>` : ''}
  `;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Preventivo EMOTIVE - ${clientName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a;">
  
  <!-- Wrapper completo -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0a">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Container email 700px -->
        <table width="700" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width: 700px;">
          
          <!-- HERO HEADER -->
          <tr>
            <td bgcolor="#1a1a1a" align="center" style="padding: 60px 40px; border-bottom: 4px solid #d4af37;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <font face="Arial, sans-serif" size="7" color="#ffffff" style="font-weight: bold; letter-spacing: 12px;">
                      EMOTIVE
                    </font>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 15px 0;">
                    <table width="80" height="4" cellpadding="0" cellspacing="0" border="0" bgcolor="#d4af37">
                      <tr><td></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 3px;">
                      Protocollo Architettonico Certificato
                    </font>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <font face="Arial, sans-serif" size="1" color="#999999" style="text-transform: uppercase; letter-spacing: 2px;">
                      Ref. ${quoteId} • ${new Date().toLocaleDateString('it-IT')}
                    </font>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BANNER -->
          <tr>
            <td bgcolor="#d4af37" align="center" style="padding: 25px 40px;">
              <font face="Arial, sans-serif" size="3" color="#1a1a1a" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                📄 PREVENTIVO PERSONALIZZATO PER ${clientName}
              </font>
            </td>
          </tr>

          <!-- CONTENUTO PRINCIPALE -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Dati Cliente -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <font face="Arial, sans-serif" size="6" color="#1a1a1a" style="font-weight: bold; font-style: italic;">
                      ${clientName}
                    </font>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <table cellpadding="15" cellspacing="0" border="0" bgcolor="#fafafa" style="border-left: 4px solid #d4af37;">
                      <tr>
                        <td>
                          <font face="Arial, sans-serif" size="2" color="#666666" style="text-transform: uppercase; letter-spacing: 2px;">
                            ${businessType} • ${location}${squareMeters ? ` • ${squareMeters} m²` : ''}
                          </font>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${clientDetails ? `
                <tr>
                  <td align="center" style="padding-bottom: 40px;">
                    ${clientDetails}
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Messaggio Introduttivo -->
              <table width="100%" cellpadding="20" cellspacing="0" border="0" bgcolor="#fafafa" style="margin-bottom: 40px; border-left: 4px solid #d4af37;">
                <tr>
                  <td>
                    <font face="Arial, sans-serif" size="3" color="#333333" style="line-height: 1.7;">
                      <strong>Ciao ${clientName},</strong>
                    </font>
                    <br><br>
                    <font face="Arial, sans-serif" size="2" color="#666666" style="line-height: 1.8;">
                      Qui sotto trovi la proposta commerciale personalizzata per avviare il <strong>Protocollo EMOTIVE®</strong> sul progetto <strong>${businessType} a ${location}</strong>.
                    </font>
                  </td>
                </tr>
              </table>

              ${projectDescriptionSection}
              ${conceptReportSection}

              <!-- OFFERTA PRINCIPALE -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 50px 0;">
                <tr>
                  <td bgcolor="#1a1a1a" style="padding: 50px 40px; border-radius: 12px; border: 2px solid #d4af37;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 15px;">
                          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 4px;">
                            Investimento Totale Protocollo
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 10px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td>
                                <font face="Arial, sans-serif" size="4" color="#666666" style="text-decoration: line-through;">
                                  € ${originalPrice.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                                </font>
                              </td>
                              <td style="padding-left: 15px;">
                                <table cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td bgcolor="#dc2626" style="padding: 5px 12px; border-radius: 4px;">
                                      <font face="Arial, sans-serif" size="2" color="#ffffff" style="font-weight: bold; text-transform: uppercase;">
                                        -${discountPercentage}%
                                      </font>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 25px;">
                          <font face="Arial, sans-serif" size="7" color="#d4af37" style="font-weight: bold;">
                            € ${totalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </font>
                          &nbsp;
                          <font face="Arial, sans-serif" size="2" color="#999999">
                            + IVA
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" bgcolor="#fef3c7" style="padding: 15px; border-radius: 8px; border-left: 4px solid #fbbf24; margin-bottom: 20px;">
                          <font face="Arial, sans-serif" size="2" color="#92400e" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            ⏰ OFFERTA VALIDA 15 GIORNI
                          </font>
                          <br>
                          <font face="Arial, sans-serif" size="1" color="#b45309" style="line-height: 1.6;">
                            Prezzo speciale valido fino al ${new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT')}
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" bgcolor="#2d2d2d" style="padding: 20px; border-radius: 8px; border: 1px dashed #d4af37;">
                          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            ✔ Stornabile 100% con acquisto arredi
                          </font>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- FASI DEL PROGETTO -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 40px 0 30px 0; border-bottom: 2px solid #f0f0f0;">
                    <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 4px;">
                      COSA OTTIENI CON EMOTIVE®
                    </font>
                  </td>
                </tr>
              </table>

              <!-- FASE A -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; margin-bottom: 25px;">
                <tr>
                  <td bgcolor="#fafafa" style="padding: 35px; border-left: 6px solid #d4af37; border-radius: 0 12px 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50" height="50" bgcolor="#d4af37" align="center" valign="middle" style="border-radius: 25px;">
                                <font face="Arial, sans-serif" size="5" color="#1a1a1a" style="font-weight: bold;">A</font>
                              </td>
                              <td style="padding-left: 15px;">
                                <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">FASE A</font>
                                <br>
                                <font face="Arial, sans-serif" size="3" color="#1a1a1a" style="font-weight: bold;">Rilievi e Impianti</font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td bgcolor="#fffbf0" style="padding: 12px 20px; border-radius: 6px; border: 1px dashed #d4af37; margin-bottom: 20px;">
                          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            ⚡ Attivabile con Acconto ${depositPercentage}%
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="30" valign="top">
                                <font face="Arial, sans-serif" size="3" color="#d4af37" style="font-weight: bold;">1.</font>
                              </td>
                              <td>
                                <font face="Arial, sans-serif" size="2" color="#555555" style="line-height: 1.6;">
                                  Rilievi tecnici e mappatura completa dello spazio
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="30" valign="top">
                                <font face="Arial, sans-serif" size="3" color="#d4af37" style="font-weight: bold;">2.</font>
                              </td>
                              <td>
                                <font face="Arial, sans-serif" size="2" color="#555555" style="line-height: 1.6;">
                                  Impostazione attrezzature, arredi e suddivisioni funzionali per normative vigenti
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="30" valign="top">
                                <font face="Arial, sans-serif" size="3" color="#d4af37" style="font-weight: bold;">3.</font>
                              </td>
                              <td>
                                <font face="Arial, sans-serif" size="2" color="#555555" style="line-height: 1.6;">
                                  Planimetrie esecutive per Impianti (Elettrici, Idrici, Opere Murarie)
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- FASE B -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 40px;">
                <tr>
                  <td bgcolor="#fafafa" style="padding: 35px; border-left: 6px solid #d4af37; border-radius: 0 12px 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50" height="50" bgcolor="#d4af37" align="center" valign="middle" style="border-radius: 25px;">
                                <font face="Arial, sans-serif" size="5" color="#1a1a1a" style="font-weight: bold;">B</font>
                              </td>
                              <td style="padding-left: 15px;">
                                <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">FASE B</font>
                                <br>
                                <font face="Arial, sans-serif" size="3" color="#1a1a1a" style="font-weight: bold;">Concept e Render</font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td bgcolor="#fffbf0" style="padding: 12px 20px; border-radius: 6px; border: 1px dashed #d4af37; margin-bottom: 20px;">
                          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            Concept e Render
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="30" valign="top">
                                <font face="Arial, sans-serif" size="3" color="#d4af37" style="font-weight: bold;">4.</font>
                              </td>
                              <td>
                                <font face="Arial, sans-serif" size="2" color="#555555" style="line-height: 1.6;">
                                  Ideazione Moodboard e Concept Identitario unico
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="30" valign="top">
                                <font face="Arial, sans-serif" size="3" color="#d4af37" style="font-weight: bold;">5.</font>
                              </td>
                              <td>
                                <font face="Arial, sans-serif" size="2" color="#555555" style="line-height: 1.6;">
                                  Render 3D Fotorealistici ad Alta Fedeltà
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="30" valign="top">
                                <font face="Arial, sans-serif" size="3" color="#d4af37" style="font-weight: bold;">⚡</font>
                              </td>
                              <td>
                                <font face="Arial, sans-serif" size="2" color="#555555" style="line-height: 1.6;">
                                  Saldo al completamento fasi progettuali
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="30" valign="top">
                                <font face="Arial, sans-serif" size="3" color="#d4af37" style="font-weight: bold;">7.</font>
                              </td>
                              <td>
                                <font face="Arial, sans-serif" size="2" color="#555555" style="line-height: 1.6;">
                                  Preventivazione arredi su misura Boncordo: attrezzature, arredamenti, accessori ed alberghiero.
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ACCONTO -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 50px 0;">
                <tr>
                  <td bgcolor="#1a1a1a" style="padding: 45px 35px; border-radius: 12px; border: 2px solid #d4af37;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 15px;">
                          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 3px;">
                            Per Attivare Subito
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 10px;">
                          <font face="Arial, sans-serif" size="7" color="#d4af37" style="font-weight: bold;">
                            € ${depositTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 25px;">
                          <font face="Arial, sans-serif" size="2" color="#999999" style="text-transform: uppercase; letter-spacing: 2px;">
                            Acconto ${depositPercentage}% + IVA
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" bgcolor="#2d2d2d" style="padding: 18px; border-radius: 8px; border: 1px dashed #d4af37;">
                          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold;">
                            ⚡ Inizio lavori entro 24 ore dal saldo acconto
                          </font>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- POLITICHE DI REVISIONE -->
              <table width="100%" cellpadding="30" cellspacing="0" border="0" bgcolor="#fffbf0" style="border-radius: 10px; border-left: 6px solid #d4af37; margin: 40px 0;">
                <tr>
                  <td align="center">
                    <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 3px;">
                      📋 Politiche di Revisione
                    </font>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48%" valign="top">
                          <table width="100%" cellpadding="20" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 8px; border: 1px solid #e8e8e8;">
                            <tr>
                              <td>
                                <table cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="35" valign="top">
                                      <font face="Arial, sans-serif" size="4">📐</font>
                                    </td>
                                    <td>
                                      <font face="Arial, sans-serif" size="2" color="#333333" style="font-weight: bold; text-transform: uppercase;">
                                        Planimetrie
                                      </font>
                                    </td>
                                  </tr>
                                </table>
                                <br>
                                <font face="Arial, sans-serif" size="2" color="#666666" style="line-height: 1.6;">
                                  Fino a <strong style="color: #d4af37;">5 revisioni incluse</strong> per le planimetrie esecutive.
                                </font>
                                <br><br>
                                <font face="Arial, sans-serif" size="1" color="#999999" style="font-style: italic; line-height: 1.6;">
                                  Oltre le 5 revisioni, il preventivo dovrà essere rimodulato in base alle modifiche richieste.
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="4%"></td>
                        <td width="48%" valign="top">
                          <table width="100%" cellpadding="20" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 8px; border: 1px solid #e8e8e8;">
                            <tr>
                              <td>
                                <table cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="35" valign="top">
                                      <font face="Arial, sans-serif" size="4">🎨</font>
                                    </td>
                                    <td>
                                      <font face="Arial, sans-serif" size="2" color="#333333" style="font-weight: bold; text-transform: uppercase;">
                                        Render 3D
                                      </font>
                                    </td>
                                  </tr>
                                </table>
                                <br>
                                <font face="Arial, sans-serif" size="2" color="#666666" style="line-height: 1.6;">
                                  Fino a <strong style="color: #d4af37;">3 revisioni incluse</strong> per i render fotorealistici.
                                </font>
                                <br><br>
                                <font face="Arial, sans-serif" size="1" color="#999999" style="font-style: italic; line-height: 1.6;">
                                  Oltre le 3 revisioni, il preventivo dovrà essere rimodulato in base alle modifiche richieste.
                                </font>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" bgcolor="#fffbf0" style="padding: 20px 30px 10px 30px; border-top: 1px solid rgba(212,175,55,0.3);">
                    <font face="Arial, sans-serif" size="1" color="#999999" style="text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.6;">
                      ℹ️ Le revisioni si intendono per correzioni e aggiustamenti minori.<br>
                      Modifiche sostanziali al progetto richiedono una nuova valutazione.
                    </font>
                  </td>
                </tr>
              </table>

              <!-- CTA PAGAMENTO -->
              <table width="100%" cellpadding="30" cellspacing="0" border="0" bgcolor="#fafafa" style="border-radius: 12px; border: 2px solid #e8e8e8; margin: 50px 0;">
                <tr>
                  <td align="center">
                    <font face="Arial, sans-serif" size="4" color="#1a1a1a" style="font-weight: bold; line-height: 1.4;">
                      Scegli come attivare il<br>Protocollo EMOTIVE®
                    </font>
                  </td>
                </tr>
                ${stripeUrl ? `
                <tr>
                  <td align="center" style="padding-top: 25px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#d4af37" style="padding: 18px 50px; border-radius: 30px;">
                          <a href="${stripeUrl}" style="text-decoration: none; color: #1a1a1a; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            💳 PAGA CON CARTA
                          </a>
                        </td>
                      </tr>
                    </table>
                    <br>
                    <font face="Arial, sans-serif" size="1" color="#999999" style="text-transform: uppercase;">
                      Pagamento sicuro con Stripe • Link valido 24 ore
                    </font>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 25px 0;">
                    <font face="Arial, sans-serif" size="2" color="#999999" style="text-transform: uppercase; letter-spacing: 2px;">
                      OPPURE
                    </font>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td>
                    <table width="100%" cellpadding="25" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 8px; border: 2px solid #e8e8e8;">
                      <tr>
                        <td align="center">
                          <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            💰 Bonifico Bancario
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" bgcolor="#fafafa" style="padding: 18px; border-radius: 6px; border: 1px solid #e0e0e0;">
                          <font face="Courier New, monospace" size="3" color="#1a1a1a" style="font-weight: bold; letter-spacing: 2px;">
                            ${iban}
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 12px;">
                          <font face="Arial, sans-serif" size="2" color="#666666">
                            <strong>Intestato a:</strong> Emotive Srl
                          </font>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 15px;">
                          <font face="Arial, sans-serif" size="2" color="#666666">
                            <strong>Causale:</strong> Attivazione ${quoteId} - ${clientName}
                          </font>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 30px;">
                    <font face="Arial, sans-serif" size="2" color="#666666" style="text-transform: uppercase; letter-spacing: 2px;">
                      Hai domande? Contattami direttamente
                    </font>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td bgcolor="#25D366" style="padding: 12px 30px; border-radius: 25px;">
                                <a href="${whatsappUrl}" style="text-decoration: none; color: #ffffff; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                                  💬 WhatsApp
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding: 0 8px;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td bgcolor="#1a1a1a" style="padding: 12px 30px; border-radius: 25px;">
                                <a href="tel:${phoneNumber}" style="text-decoration: none; color: #ffffff; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                                  📞 Chiama Ora
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- GARANZIE -->
              <table width="100%" cellpadding="30" cellspacing="0" border="0" bgcolor="#fffbf0" style="border-radius: 10px; border-left: 6px solid #d4af37; margin: 40px 0;">
                <tr>
                  <td align="center">
                    <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                      ★ Garanzie EMOTIVE
                    </font>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <table width="100%" cellpadding="15" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 6px; border: 1px solid #e8e8e8; margin-bottom: 15px;">
                      <tr>
                        <td>
                          <font face="Arial, sans-serif" size="2" color="#333333" style="font-weight: bold;">
                            ✔ Investimento 100% Stornabile
                          </font>
                          <br>
                          <font face="Arial, sans-serif" size="2" color="#666666" style="line-height: 1.6;">
                            L'importo pagato viene completamente scalato dall'acquisto arredi Boncordo
                          </font>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="15" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 6px; border: 1px solid #e8e8e8; margin-bottom: 15px;">
                      <tr>
                        <td>
                          <font face="Arial, sans-serif" size="2" color="#333333" style="font-weight: bold;">
                            ✔ Inizio Lavori Immediato
                          </font>
                          <br>
                          <font face="Arial, sans-serif" size="2" color="#666666" style="line-height: 1.6;">
                            Avvio progetto entro 24 ore dal saldo dell'acconto
                          </font>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="15" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 6px; border: 1px solid #e8e8e8;">
                      <tr>
                        <td>
                          <font face="Arial, sans-serif" size="2" color="#333333" style="font-weight: bold;">
                            ✔ Metodo Collaudato
                          </font>
                          <br>
                          <font face="Arial, sans-serif" size="2" color="#666666" style="line-height: 1.6;">
                            Oltre 150 format ristorativi realizzati con successo in tutta Italia
                          </font>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- SCADENZA OFFERTA -->
              <table width="100%" cellpadding="25" cellspacing="0" border="0" bgcolor="#1a1a1a" style="border-radius: 10px; border: 2px solid #d4af37; margin: 40px 0;">
                <tr>
                  <td align="center">
                    <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                      ⏰ Scadenza Offerta Speciale
                    </font>
                    <br><br>
                    <font face="Arial, sans-serif" size="3" color="#ffffff" style="line-height: 1.7; font-weight: bold;">
                      Questa offerta scontata è <strong style="color: #d4af37;">valida per 15 giorni</strong> dalla data di ricezione.
                    </font>
                    <br><br>
                    <font face="Arial, sans-serif" size="2" color="#cccccc" style="line-height: 1.6;">
                      Scadenza: <strong style="color: #d4af37;">${new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT')}</strong>
                    </font>
                    <br>
                    <font face="Arial, sans-serif" size="2" color="#999999" style="line-height: 1.6;">
                      Dopo questa data, il prezzo tornerà a € ${originalPrice.toLocaleString('it-IT', { minimumFractionDigits: 0 })} + IVA
                    </font>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#1a1a1a" align="center" style="padding: 50px 40px; border-top: 4px solid #d4af37;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <font face="Arial, sans-serif" size="5" color="#ffffff" style="font-weight: bold; letter-spacing: 4px;">
                      EMOTIVE
                    </font>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 15px 0 5px 0;">
                    <font face="Arial, sans-serif" size="2" color="#d4af37" style="font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                      Format & Concept • Protocollo Architettonico
                    </font>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <font face="Arial, sans-serif" size="1" color="#999999" style="text-transform: uppercase; letter-spacing: 2px;">
                      Ingegneria Commerciale Ristorativa
                    </font>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; border-top: 1px solid #333333; border-bottom: 1px solid #333333;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 12px;">
                          <a href="${websiteEmotive}" style="text-decoration: none; color: #d4af37; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 15px; display: inline-block;">
                            🌐 EMOTIVE Design
                          </a>
                          <font face="Arial, sans-serif" size="1" color="#666666">•</font>
                          <a href="${websiteBoncordo}" style="text-decoration: none; color: #d4af37; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 15px; display: inline-block;">
                            🌐 Boncordo Arredi
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="${whatsappUrl}" style="text-decoration: none; color: #d4af37; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 15px; display: inline-block;">
                            💬 WhatsApp
                          </a>
                          <font face="Arial, sans-serif" size="1" color="#666666">•</font>
                          <a href="tel:${phoneNumber}" style="text-decoration: none; color: #d4af37; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 15px; display: inline-block;">
                            📞 ${phoneNumber}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <font face="Arial, sans-serif" size="1" color="#666666" style="text-transform: uppercase; letter-spacing: 2px; line-height: 1.8;">
                      Ingegneria Commerciale per Format Ristorativi<br>
                      <a href="${websiteEmotive}" style="color: #999999; text-decoration: none;">www.emotivedesign.it</a> • <a href="${websiteBoncordo}" style="color: #999999; text-decoration: none;">www.boncordoarredi.it</a>
                    </font>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}

/**
 * Genera PDF del preventivo con CSS ottimizzato per la stampa
 */
async function generateQuotePDF(data) {
  const html = generateQuoteHTML(data);
  
  // CSS specifico per PDF - evita tagli tra pagine
  const pdfCSS = `
    <style>
      @page {
        margin: 15mm;
        size: A4;
      }
      
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Evita tagli nelle sezioni principali */
      table[width="100%"] {
        page-break-inside: avoid !important;
      }
      
      /* Header sempre in cima */
      table[bgcolor="#1a1a1a"]:first-of-type {
        page-break-after: avoid !important;
      }
      
      /* Banner oro non tagliato */
      table[bgcolor="#d4af37"] {
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
      }
      
      /* Offerta principale non tagliata */
      td[bgcolor="#1a1a1a"] table[width="100%"] {
        page-break-inside: avoid !important;
      }
      
      /* Fase A e B complete */
      td[bgcolor="#fafafa"] {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }
      
      /* CTA e garanzie */
      table[bgcolor="#fafafa"][cellpadding="30"] {
        page-break-inside: avoid !important;
      }
      
      /* Footer sempre in fondo */
      table[bgcolor="#1a1a1a"]:last-of-type {
        page-break-before: auto !important;
      }
    </style>
  `;
  
  // Inserisci CSS prima di </head>
  const htmlWithPdfCSS = html.replace('</head>', `${pdfCSS}</head>`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlWithPdfCSS, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '15mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm'
    }
  });
  
  await browser.close();
  return pdfBuffer;
}

module.exports = {
  generateQuoteHTML,
  generateQuotePDF
};
