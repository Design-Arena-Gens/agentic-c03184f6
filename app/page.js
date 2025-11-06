"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'mbbs_screenshots_v1';

function loadStoredItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Failed to load from storage', e);
    return [];
  }
}

function saveStoredItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save to storage', e);
  }
}

function seedIfEmpty(current) {
  if (current && current.length > 0) return current;
  const now = Date.now();
  const samples = [
    { id: `sample-anat-${now}` , src: '/screenshots/anatomy.svg', subject: 'Anatomy', topic: 'Upper limb', year: 2020, tags: ['essay'], createdAt: now },
    { id: `sample-phys-${now+1}`, src: '/screenshots/physiology.svg', subject: 'Physiology', topic: 'Cardiac cycle', year: 2021, tags: ['short'], createdAt: now+1 },
    { id: `sample-bioc-${now+2}`, src: '/screenshots/biochemistry.svg', subject: 'Biochemistry', topic: 'Urea cycle', year: 2019, tags: ['viva'], createdAt: now+2 },
    { id: `sample-path-${now+3}`, src: '/screenshots/pathology.svg', subject: 'Pathology', topic: 'Inflammation', year: 2022, tags: ['essay'], createdAt: now+3 },
    { id: `sample-pharm-${now+4}`, src: '/screenshots/pharmacology.svg', subject: 'Pharmacology', topic: 'ANS drugs', year: 2020, tags: ['short'], createdAt: now+4 },
    { id: `sample-micro-${now+5}`, src: '/screenshots/microbiology.svg', subject: 'Microbiology', topic: 'Sterilization', year: 2023, tags: ['viva'], createdAt: now+5 },
  ];
  saveStoredItems(samples);
  return samples;
}

function useScreenshots() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loaded = loadStoredItems();
    setItems(seedIfEmpty(loaded));
  }, []);

  useEffect(() => {
    if (items && items.length >= 0) saveStoredItems(items);
  }, [items]);

  const addBatch = useCallback((newItems) => {
    setItems((prev) => [...newItems, ...prev]);
  }, []);

  const updateItem = useCallback((id, updates) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...updates } : it));
  }, []);

  const deleteItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return { items, addBatch, updateItem, deleteItem };
}

function useFilters(items) {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('All');
  const [year, setYear] = useState('All');
  const [tag, setTag] = useState('All');

  const subjects = useMemo(() => ['All', ...Array.from(new Set(items.map(i => i.subject)))], [items]);
  const years = useMemo(() => ['All', ...Array.from(new Set(items.map(i => String(i.year))))], [items]);
  const tags = useMemo(() => ['All', ...Array.from(new Set(items.flatMap(i => i.tags || [])))], [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (subject !== 'All' && it.subject !== subject) return false;
      if (year !== 'All' && String(it.year) !== String(year)) return false;
      if (tag !== 'All' && !(it.tags || []).includes(tag)) return false;
      if (!q) return true;
      const text = [it.subject, it.topic, (it.tags||[]).join(' '), String(it.year)].join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [items, query, subject, year, tag]);

  return { query, setQuery, subject, setSubject, year, setYear, tag, setTag, subjects, years, tags, filtered };
}

function readFilesAsDataUrls(files) {
  const readers = Array.from(files).map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: String(reader.result) });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }));
  return Promise.all(readers);
}

function UploadPanel({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [subject, setSubject] = useState('General');
  const [topic, setTopic] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [tags, setTags] = useState('');
  const fileInputRef = useRef(null);

  const onFiles = useCallback(async (files) => {
    const dataUrls = await readFilesAsDataUrls(files);
    setPendingImages(dataUrls);
    setOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const now = Date.now();
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
    const newItems = pendingImages.map((img, idx) => ({
      id: `up-${now}-${idx}`,
      dataUrl: img.dataUrl,
      subject: subject || 'General',
      topic: topic || 'Untitled',
      year: Number(year) || new Date().getFullYear(),
      tags: tagList,
      createdAt: now + idx,
    }));
    onAdd(newItems);
    setOpen(false);
    setPendingImages([]);
    setTopic('');
    setTags('');
  }, [pendingImages, subject, topic, year, tags, onAdd]);

  return (
    <div className="upload-panel">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && onFiles(e.target.files)}
        style={{ display: 'none' }}
      />
      <button className="btn primary" onClick={() => fileInputRef.current?.click()}>
        Upload Screenshots
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add details (applies to all {pendingImages.length} files)</h3>
            <div className="form-row">
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Anatomy" />
            </div>
            <div className="form-row">
              <label>Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Upper limb" />
            </div>
            <div className="form-row">
              <label>Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Tags</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma separated e.g., essay,short" />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={handleSubmit}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Filters({ state }) {
  const { query, setQuery, subject, setSubject, year, setYear, tag, setTag, subjects, years, tags } = state;
  return (
    <div className="filters">
      <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subject, topic, year, tags" />
      <div className="filter-row">
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}

function Lightbox({ item, onClose, onUpdate, onDelete }) {
  const [subject, setSubject] = useState(item.subject || '');
  const [topic, setTopic] = useState(item.topic || '');
  const [year, setYear] = useState(item.year || '');
  const [tags, setTags] = useState((item.tags || []).join(','));

  useEffect(() => {
    setSubject(item.subject || '');
    setTopic(item.topic || '');
    setYear(item.year || '');
    setTags((item.tags || []).join(','));
  }, [item]);

  const src = item.dataUrl || item.src;

  const handleSave = () => {
    const next = {
      subject,
      topic,
      year: Number(year) || item.year,
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
    };
    onUpdate(item.id, next);
    onClose();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${item.subject || 'MBBS'}-${item.topic || 'question'}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal xl" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox">
          <div className="image-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={item.topic || 'screenshot'} />
          </div>
          <div className="meta">
            <div className="form-row">
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Tags</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma separated" />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={handleDownload}>Download</button>
              <button className="btn danger" onClick={() => { onDelete(item.id); onClose(); }}>Delete</button>
              <button className="btn" onClick={onClose}>Close</button>
              <button className="btn primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gallery({ items, onClick }) {
  return (
    <div className="gallery">
      {items.map((it) => (
        <div className="card" key={it.id} onClick={() => onClick(it)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.dataUrl || it.src} alt={it.topic || 'screenshot'} />
          <div className="meta">
            <div className="title">{it.subject} ? {it.year}</div>
            <div className="topic">{it.topic}</div>
            <div className="tags">{(it.tags || []).map(t => <span key={t} className="tag">{t}</span>)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const { items, addBatch, updateItem, deleteItem } = useScreenshots();
  const filters = useFilters(items);
  const [selected, setSelected] = useState(null);

  return (
    <div className="container">
      <div className="topbar">
        <Filters state={filters} />
        <UploadPanel onAdd={addBatch} />
      </div>
      <Gallery items={filters.filtered} onClick={setSelected} />
      {selected && (
        <Lightbox
          item={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateItem}
          onDelete={deleteItem}
        />
      )}
    </div>
  );
}
