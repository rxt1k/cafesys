import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, EyeOff, Star, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Category, Dish, Extra } from '@/lib/types';
import { formatCurrency, slugify, cn } from '@/lib/utils';
import { DishTypeBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dishes' | 'categories'>('dishes');
  const [showDishModal, setShowDishModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [expandedDish, setExpandedDish] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [catRes, dishRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('dishes').select('*, extras(*), category:categories(name)').order('sort_order'),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (dishRes.data) setDishes(dishRes.data as Dish[]);
    setLoading(false);
  }

  async function toggleDishProp(dishId: string, prop: 'is_available' | 'is_hidden' | 'is_popular' | 'is_recommended', current: boolean) {
    await supabase.from('dishes').update({ [prop]: !current }).eq('id', dishId);
    fetchData();
  }

  async function deleteDish(dishId: string) {
    if (!confirm('Delete this dish?')) return;
    await supabase.from('dishes').delete().eq('id', dishId);
    toast.success('Dish deleted');
    fetchData();
  }

  async function deleteCategory(catId: string) {
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', catId);
    toast.success('Category deleted');
    fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-primary">Menu Management</h1>
        <div className="flex gap-2">
          {activeTab === 'dishes' ? (
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditingDish(null); setShowDishModal(true); }}>
              Add Dish
            </Button>
          ) : (
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditingCat(null); setShowCatModal(true); }}>
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl w-fit">
        {(['dishes', 'categories'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              activeTab === tab ? 'bg-white dark:bg-stone-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'
            )}
          >
            {tab} ({tab === 'dishes' ? dishes.length : categories.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : activeTab === 'dishes' ? (
        <div className="space-y-3">
          {dishes.map((dish, i) => (
            <motion.div
              key={dish.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn('bg-surface rounded-2xl shadow-card overflow-hidden', dish.is_hidden && 'opacity-60')}
            >
              <div className="flex items-center gap-3 p-4">
                {/* Image */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-700 flex-shrink-0">
                  {dish.image_url ? (
                    <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <DishTypeBadge type={dish.type} />
                    <span className="font-semibold text-sm text-primary truncate">{dish.name}</span>
                    {dish.is_popular && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-secondary">
                    {(dish.category as unknown as { name: string })?.name || 'Uncategorized'} &bull; {formatCurrency(dish.price)}
                    {dish.discounted_price && <span className="line-through ml-1 text-secondary">{formatCurrency(dish.price)}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleDishProp(dish.id, 'is_available', dish.is_available)}
                    className={cn(
                      'text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                      dish.is_available
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    )}
                  >
                    {dish.is_available ? 'Available' : 'Out of Stock'}
                  </button>
                  <button
                    onClick={() => toggleDishProp(dish.id, 'is_hidden', dish.is_hidden)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  >
                    {dish.is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setEditingDish(dish); setShowDishModal(true); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteDish(dish.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedDish(expandedDish === dish.id ? null : dish.id)}
                    className="text-secondary"
                  >
                    {expandedDish === dish.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Extras */}
              <AnimatePresence>
                {expandedDish === dish.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-default"
                  >
                    <ExtrasManager dishId={dish.id} extras={dish.extras || []} onRefresh={fetchData} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-surface rounded-2xl shadow-card p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-700 flex-shrink-0">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-secondary text-lg">
                    {cat.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-primary">{cat.name}</p>
                <p className="text-xs text-secondary">
                  {dishes.filter((d) => d.category_id === cat.id).length} dishes &bull;{' '}
                  {cat.is_active ? 'Active' : 'Hidden'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setEditingCat(cat); setShowCatModal(true); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dish Modal */}
      <Modal isOpen={showDishModal} onClose={() => setShowDishModal(false)} title={editingDish ? 'Edit Dish' : 'Add Dish'} size="lg">
        <DishForm
          dish={editingDish}
          categories={categories}
          onSave={() => { setShowDishModal(false); fetchData(); }}
          onClose={() => setShowDishModal(false)}
        />
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? 'Edit Category' : 'Add Category'} size="sm">
        <CategoryForm
          category={editingCat}
          onSave={() => { setShowCatModal(false); fetchData(); }}
          onClose={() => setShowCatModal(false)}
        />
      </Modal>
    </div>
  );
}

function ExtrasManager({ dishId, extras, onRefresh }: { dishId: string; extras: Extra[]; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [adding, setAdding] = useState(false);

  async function addExtra() {
    if (!name || !price) return;
    setAdding(true);
    await supabase.from('extras').insert({ dish_id: dishId, name, price: parseFloat(price), is_available: true });
    setName('');
    setPrice('');
    setAdding(false);
    onRefresh();
  }

  async function deleteExtra(id: string) {
    await supabase.from('extras').delete().eq('id', id);
    onRefresh();
  }

  async function toggleExtra(id: string, current: boolean) {
    await supabase.from('extras').update({ is_available: !current }).eq('id', id);
    onRefresh();
  }

  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Add-ons / Extras</p>
      <div className="space-y-2 mb-3">
        {extras.map((extra) => (
          <div key={extra.id} className="flex items-center gap-2 text-sm">
            <span className={cn('flex-1 text-primary', !extra.is_available && 'line-through text-secondary')}>
              {extra.name}
            </span>
            <span className="text-secondary tabular-nums">{formatCurrency(extra.price)}</span>
            <button
              onClick={() => toggleExtra(extra.id, extra.is_available)}
              className="text-xs text-secondary hover:text-primary"
            >
              {extra.is_available ? 'Disable' : 'Enable'}
            </button>
            <button onClick={() => deleteExtra(extra.id)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {extras.length === 0 && <p className="text-xs text-secondary">No add-ons yet</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Extra name"
          className="input-base flex-1 text-sm"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          type="number"
          className="input-base w-24 text-sm"
        />
        <Button size="sm" loading={adding} onClick={addExtra}>Add</Button>
      </div>
    </div>
  );
}

function DishForm({
  dish,
  categories,
  onSave,
  onClose,
}: {
  dish: Dish | null;
  categories: Category[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: dish?.name || '',
    category_id: dish?.category_id || '',
    description: dish?.description || '',
    short_description: dish?.short_description || '',
    price: dish?.price?.toString() || '',
    discounted_price: dish?.discounted_price?.toString() || '',
    type: dish?.type || 'veg',
    preparation_time: dish?.preparation_time?.toString() || '',
    calories: dish?.calories?.toString() || '',
    spice_level: dish?.spice_level?.toString() || '',
    is_popular: dish?.is_popular || false,
    is_recommended: dish?.is_recommended || false,
    is_available: dish?.is_available ?? true,
    is_hidden: dish?.is_hidden || false,
    sort_order: dish?.sort_order?.toString() || '0',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(dish?.image_url || '');
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const path = `dishes/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('images').upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from('images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave() {
    if (!form.name || !form.price) {
      toast.error('Name and price are required');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = dish?.image_url || null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = {
        name: form.name,
        slug: slugify(form.name),
        category_id: form.category_id || null,
        description: form.description || null,
        short_description: form.short_description || null,
        price: parseFloat(form.price),
        discounted_price: form.discounted_price ? parseFloat(form.discounted_price) : null,
        type: form.type as 'veg' | 'non_veg' | 'egg',
        image_url: imageUrl,
        is_popular: form.is_popular,
        is_recommended: form.is_recommended,
        is_available: form.is_available,
        is_hidden: form.is_hidden,
        preparation_time: form.preparation_time ? parseInt(form.preparation_time) : null,
        calories: form.calories ? parseInt(form.calories) : null,
        spice_level: form.spice_level ? parseInt(form.spice_level) : null,
        sort_order: parseInt(form.sort_order) || 0,
      };

      if (dish) {
        await supabase.from('dishes').update(payload).eq('id', dish.id);
        toast.success('Dish updated');
      } else {
        await supabase.from('dishes').insert(payload);
        toast.success('Dish added');
      }
      onSave();
    } catch {
      toast.error('Failed to save dish');
    } finally {
      setSaving(false);
    }
  }

  const upd = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="p-6 space-y-4">
      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-primary mb-2">Image</label>
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-700 flex-shrink-0">
            {imagePreview ? (
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Upload className="w-5 h-5 text-secondary" />
              </div>
            )}
          </div>
          <div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="dish-img" />
            <label
              htmlFor="dish-img"
              className="cursor-pointer text-sm text-accent border border-amber-300 rounded-xl px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Image
            </label>
            <p className="text-xs text-secondary mt-1">JPG, PNG up to 5MB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-primary mb-1">Name *</label>
          <input value={form.name} onChange={(e) => upd('name', e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Category</label>
          <select value={form.category_id} onChange={(e) => upd('category_id', e.target.value)} className="input-base">
            <option value="">No Category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Type</label>
          <select value={form.type} onChange={(e) => upd('type', e.target.value)} className="input-base">
            <option value="veg">Vegetarian</option>
            <option value="non_veg">Non-Vegetarian</option>
            <option value="egg">Egg</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Price (INR) *</label>
          <input type="number" value={form.price} onChange={(e) => upd('price', e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Discounted Price</label>
          <input type="number" value={form.discounted_price} onChange={(e) => upd('discounted_price', e.target.value)} className="input-base" placeholder="Optional" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-primary mb-1">Short Description</label>
          <input value={form.short_description} onChange={(e) => upd('short_description', e.target.value)} className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-primary mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => upd('description', e.target.value)} rows={2} className="input-base resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Prep Time (min)</label>
          <input type="number" value={form.preparation_time} onChange={(e) => upd('preparation_time', e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Calories</label>
          <input type="number" value={form.calories} onChange={(e) => upd('calories', e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Spice Level (1-5)</label>
          <input type="number" min="1" max="5" value={form.spice_level} onChange={(e) => upd('spice_level', e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={(e) => upd('sort_order', e.target.value)} className="input-base" />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'is_popular', label: 'Popular' },
          { key: 'is_recommended', label: "Chef's Pick" },
          { key: 'is_available', label: 'Available' },
          { key: 'is_hidden', label: 'Hidden' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key as keyof typeof form] as boolean}
              onChange={(e) => upd(key, e.target.checked)}
              className="w-4 h-4 rounded accent-amber-600"
            />
            <span className="text-sm text-primary">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button fullWidth loading={saving} onClick={handleSave}>
          {dish ? 'Save Changes' : 'Add Dish'}
        </Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  onSave,
  onClose,
}: {
  category: Category | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order?.toString() || '0');
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name) return;
    setSaving(true);
    const payload = {
      name,
      slug: slugify(name),
      description: description || null,
      sort_order: parseInt(sortOrder) || 0,
      is_active: isActive,
    };
    if (category) {
      await supabase.from('categories').update(payload).eq('id', category.id);
      toast.success('Category updated');
    } else {
      await supabase.from('categories').insert(payload);
      toast.success('Category added');
    }
    setSaving(false);
    onSave();
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" />
      </div>
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-base resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-primary mb-1">Sort Order</label>
        <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input-base" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded accent-amber-600" />
        <span className="text-sm text-primary">Active (visible on menu)</span>
      </label>
      <div className="flex gap-3">
        <Button fullWidth loading={saving} onClick={handleSave}>
          {category ? 'Save Changes' : 'Add Category'}
        </Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
