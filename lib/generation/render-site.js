import { PassThrough } from 'node:stream';
import archiver from 'archiver';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function renderSiteArchive(site) {
  const chunks = [];
  const output = new PassThrough();
  output.on('data', (chunk) => chunks.push(chunk));

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => output.destroy(error));
  archive.pipe(output);

  const businessName = escapeHtml(site.business_name);
  const description = escapeHtml(site.business_description);
  const businessType = escapeHtml(site.business_type);
  archive.append(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${businessName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main>
    <p class="eyebrow">${businessType}</p>
    <h1>${businessName}</h1>
    <p class="description">${description}</p>
    <section><h2>Visit us</h2><p>Contact this business to learn more.</p></section>
  </main>
</body>
</html>
`, { name: 'index.html' });
  archive.append(`body { margin: 0; padding: 10vw; color: #21302d; background: #f3efe6; font-family: Georgia, serif; } main { max-width: 720px; } .eyebrow { color: #bd583d; font: 700 0.8rem Arial, sans-serif; letter-spacing: 0.15em; text-transform: uppercase; } h1 { font-size: clamp(3rem, 9vw, 7rem); line-height: .95; font-weight: 500; margin: 1rem 0; } .description { max-width: 38rem; color: #5f6b66; font: 1.15rem/1.6 Arial, sans-serif; } section { margin-top: 5rem; border-top: 1px solid #c7c9bd; padding-top: 1.5rem; }`, { name: 'styles.css' });
  archive.append(JSON.stringify({ generatedAt: new Date().toISOString(), template: site.template_location }, null, 2), { name: 'site-manifest.json' });
  await archive.finalize();

  return new Promise((resolve, reject) => {
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);
  });
}
