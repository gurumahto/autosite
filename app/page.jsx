'use client';

import { useState } from 'react';

const templates = [
  { id: 'salon', name: 'Salon Studio', description: 'Elegant, service-led presence for salons and spas.' },
  { id: 'photo-studio', name: 'Photo Studio', description: 'Editorial portfolio layout for photographers and creative teams.' },
];

export default function HomePage() {
  const [selectedTemplate, setSelectedTemplate] = useState('salon');
  const [status, setStatus] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('Saving details...');
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        businessName: formData.get('businessName'),
        businessType: formData.get('businessType'),
        description: formData.get('description'),
        templateId: formData.get('template'),
      }),
    });

    setStatus(response.ok ? 'Details saved. Your site is being generated.' : 'Details could not be saved.');
  }

  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">AUTOSITE / WEBSITE WORKSHOP</p>
        <h1>Turn your business story into a place people can visit.</h1>
        <p className="lede">Choose a starting point, add your business details, and prepare a polished site for publishing.</p>
      </section>

      <form className="workspace" onSubmit={handleSubmit}>
        <div className="form-column">
          <label>
            Your name
            <input name="name" required placeholder="Jordan Lee" />
          </label>
          <label>
            Email address
            <input name="email" type="email" required placeholder="jordan@example.com" />
          </label>
          <label>
            Phone number
            <input name="phone" type="tel" placeholder="+1 555 0100" />
          </label>
          <label>
            Business name
            <input name="businessName" required placeholder="Northline Studio" />
          </label>
          <label>
            Business type
            <input name="businessType" required placeholder="Salon, studio, or agency" />
          </label>
          <label>
            Business description
            <textarea name="description" required rows="5" placeholder="What makes this business worth remembering?" />
          </label>
          <button type="submit">Start building</button>
          {status && <p className="status">{status}</p>}
        </div>

        <fieldset className="template-column">
          <legend>Choose a template</legend>
          {templates.map((template) => (
            <label className={`template-option ${selectedTemplate === template.id ? 'selected' : ''}`} key={template.id}>
              <input
                type="radio"
                name="template"
                value={template.id}
                checked={selectedTemplate === template.id}
                onChange={(event) => setSelectedTemplate(event.target.value)}
              />
              <span>
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
      </form>
    </main>
  );
}
