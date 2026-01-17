import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Edit2, Trash2, Filter, Package, AlertCircle, X, Check, Loader2, Save, Eye, EyeOff, Archive, TrendingUp, TrendingDown
} from 'lucide-react';
import { Product } from '../types';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../services/supabaseService';
import { fetchProductMovementClassifications } from '../services/inventoryMovementService';
import { useRealtimeList } from '../hooks/useRealtimeList';
import { applyOptimisticUpdate, applyOptimisticDelete } from '../utils/optimisticUpdates';

const ProductDatabase: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const initialFormState: Omit<Product, 'id'> = {
    part_no: '',
    oem_no: '',
    brand: '',
    barcode: '',
    no_of_pieces_per_box: 0,
    item_code: '',
    description: '',
    size: '',
    reorder_quantity: 0,
    status: 'Active',
    category: '',
    descriptive_inquiry: '',
    no_of_holes: '',
    replenish_quantity: 0,
    original_pn_no: '',
    application: '',
    no_of_cylinder: '',

    // Prices
    price_aa: 0,
    price_bb: 0,
    price_cc: 0,
    price_dd: 0,
    price_vip1: 0,
    price_vip2: 0,

    // Warehouse Stocks
    stock_wh1: 0,
    stock_wh2: 0,
    stock_wh3: 0,
    stock_wh4: 0,
    stock_wh5: 0,
    stock_wh6: 0
  };

  const [formData, setFormData] = useState<Omit<Product, 'id'>>(initialFormState);

  // Use real-time list hook for products
  const sortByPartNo = (a: Product, b: Product) => {
    return a.part_no.localeCompare(b.part_no);
  };

  const { data: products, isLoading, setData: setProducts } = useRealtimeList<Product>({
    tableName: 'products',
    initialFetchFn: fetchProducts,
    sortFn: sortByPartNo,
  });

  // Movement classification state
  type MovementCategory = 'fast' | 'slow' | 'normal';
  const [movementMap, setMovementMap] = useState<Map<string, MovementCategory>>(new Map());

  useEffect(() => {
    const loadMovementData = async () => {
      try {
        const classifications = await fetchProductMovementClassifications();
        setMovementMap(classifications);
      } catch (error) {
        console.error('Error loading movement classifications:', error);
      }
    };
    loadMovementData();
  }, []);

  const filteredProducts = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(p =>
      p.part_no.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery) ||
      p.item_code.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      // Optimistic delete
      setProducts(prev => applyOptimisticDelete(prev, id));

      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('Error deleting product:', error);
        // Real-time subscription will correct the state
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingProduct) {
        // Optimistic update
        setProducts(prev => applyOptimisticUpdate(prev, editingProduct.id, formData));
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Failed to save product');
      // Real-time subscription will correct the state
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const formatPrice = (val: number | undefined) => val ? val.toLocaleString() : '0';

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-blue" />
            Product Database
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage inventory catalog, pricing, and warehouse stocks.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search part no, brand, description..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:border-brand-blue outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Product Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
              <tr className="text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 w-12 text-center">Status</th>
                <th className="p-4">Product Info</th>
                <th className="p-4 w-64">Pricing Structure</th>
                <th className="p-4 w-64">Warehouse Inventory</th>
                <th className="p-4 text-center w-24">Specs</th>
                <th className="p-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 italic">
                    No products found.
                  </td>
                </tr>
              ) : filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 text-center align-top pt-5">
                    {product.status === 'Active' ? (
                      <Eye className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-slate-400 mx-auto" />
                    )}
                  </td>

                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-white text-base">{product.part_no}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] rounded uppercase font-bold tracking-wider">{product.brand}</span>
                        {/* Movement Classification Badge */}
                        {movementMap.get(product.id) === 'fast' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] rounded uppercase font-bold tracking-wider">
                            <TrendingUp className="w-3 h-3" />
                            Fast
                          </span>
                        )}
                        {movementMap.get(product.id) === 'slow' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] rounded uppercase font-bold tracking-wider">
                            <TrendingDown className="w-3 h-3" />
                            Slow
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{product.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>Category: {product.category}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="font-mono">Code: {product.item_code}</span>
                        {product.oem_no && (
                          <>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="font-mono">OEM: {product.oem_no}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-4 align-top">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="flex justify-between items-center"><span className="text-slate-500">AA</span> <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatPrice(product.price_aa)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500">BB</span> <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatPrice(product.price_bb)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500">CC</span> <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatPrice(product.price_cc)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500">DD</span> <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatPrice(product.price_dd)}</span></div>
                        <div className="flex justify-between items-center col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700 mt-1">
                          <span className="text-amber-600 dark:text-amber-500 font-bold">VIP1</span>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{formatPrice(product.price_vip1)}</span>
                        </div>
                        <div className="flex justify-between items-center col-span-2">
                          <span className="text-amber-600 dark:text-amber-500 font-bold">VIP2</span>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{formatPrice(product.price_vip2)}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 align-top">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[1, 2, 3, 4, 5, 6].map(i => {
                          // @ts-ignore
                          const stock = product[`stock_wh${i}`];
                          const hasStock = stock > 0;
                          return (
                            <div key={i} className={`flex flex-col items-center p-1 rounded ${hasStock ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                              <span className="text-[10px] text-slate-400">WH{i}</span>
                              <span className={`font-mono font-bold ${hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>{stock}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </td>

                  <td className="p-4 align-top text-center">
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 rounded">
                        {product.no_of_pieces_per_box} / box
                      </span>
                      {product.size && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">{product.size}</span>
                      )}
                    </div>
                  </td>

                  <td className="p-4 align-top text-right pt-5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Core Identifiers */}
                <div className="md:col-span-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Package className="w-3 h-3" /> Identification
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Part No *</label>
                      <input required name="part_no" value={formData.part_no} onChange={handleInputChange} className="input-field" placeholder="e.g. 123-ABC" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">OEM No</label>
                      <input name="oem_no" value={formData.oem_no} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Original PN</label>
                      <input name="original_pn_no" value={formData.original_pn_no} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Item Code</label>
                      <input name="item_code" value={formData.item_code} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Barcode</label>
                      <input name="barcode" value={formData.barcode} onChange={handleInputChange} className="input-field" />
                    </div>

                    {/* Updated Status Toggle */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Visibility Status</label>
                      <div className="flex items-center gap-2 h-[42px]">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, status: prev.status === 'Active' ? 'Inactive' : 'Active' }))}
                          className={`flex-1 h-full rounded-lg border flex items-center justify-center gap-2 transition-colors ${formData.status === 'Active'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-900 dark:text-emerald-400'
                            : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                            }`}
                        >
                          {formData.status === 'Active' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          <span className="text-sm font-medium">{formData.status === 'Active' ? 'Unhidden (Active)' : 'Hidden (Inactive)'}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Pricing Configuration */}
                <div className="md:col-span-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Pricing Groups
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Price AA</label>
                      <input type="number" name="price_aa" value={formData.price_aa} onChange={handleInputChange} className="input-field bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Price BB</label>
                      <input type="number" name="price_bb" value={formData.price_bb} onChange={handleInputChange} className="input-field bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Price CC</label>
                      <input type="number" name="price_cc" value={formData.price_cc} onChange={handleInputChange} className="input-field bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Price DD</label>
                      <input type="number" name="price_dd" value={formData.price_dd} onChange={handleInputChange} className="input-field bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-600 dark:text-amber-500 mb-1">Price VIP1</label>
                      <input type="number" name="price_vip1" value={formData.price_vip1} onChange={handleInputChange} className="input-field bg-amber-50/50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-600 dark:text-amber-500 mb-1">Price VIP2</label>
                      <input type="number" name="price_vip2" value={formData.price_vip2} onChange={handleInputChange} className="input-field bg-amber-50/50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900" />
                    </div>
                  </div>
                </div>

                {/* Warehouse Inventory */}
                <div className="md:col-span-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Warehouse Inventory
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <div key={num}>
                        <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">WH {num}</label>
                        <input
                          type="number"
                          name={`stock_wh${num}`}
                          // @ts-ignore
                          value={formData[`stock_wh${num}`]}
                          onChange={handleInputChange}
                          className="input-field bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className="md:col-span-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Product Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Description *</label>
                      <input required name="description" value={formData.description} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
                      <input name="brand" value={formData.brand} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                      <input name="category" value={formData.category} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Application</label>
                      <input name="application" value={formData.application} onChange={handleInputChange} className="input-field" placeholder="Vehicle model, engine, etc." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Descriptive Inquiry</label>
                      <input name="descriptive_inquiry" value={formData.descriptive_inquiry} onChange={handleInputChange} className="input-field" />
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="md:col-span-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Specifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Size</label>
                      <input name="size" value={formData.size} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">No. of Holes</label>
                      <input name="no_of_holes" value={formData.no_of_holes} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">No. of Cylinder</label>
                      <input name="no_of_cylinder" value={formData.no_of_cylinder} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Pieces per Box</label>
                      <input type="number" name="no_of_pieces_per_box" value={formData.no_of_pieces_per_box} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Reorder Qty</label>
                      <input type="number" name="reorder_quantity" value={formData.reorder_quantity} onChange={handleInputChange} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Replenish Qty</label>
                      <input type="number" name="replenish_quantity" value={formData.replenish_quantity} onChange={handleInputChange} className="input-field" />
                    </div>
                  </div>
                </div>

              </div>
              <style>{`
                .input-field {
                  width: 100%;
                  background-color: rgb(248 250 252);
                  border: 1px solid rgb(226 232 240);
                  border-radius: 0.5rem;
                  padding: 0.5rem 0.75rem;
                  font-size: 0.875rem;
                  color: rgb(30 41 59);
                  outline: none;
                  transition: all 0.2s;
                }
                .dark .input-field {
                  background-color: rgb(30 41 59);
                  border-color: rgb(51 65 85);
                  color: white;
                }
                .input-field:focus {
                  border-color: #0F5298;
                  box-shadow: 0 0 0 1px #0F5298;
                }
                
                /* Custom Scrollbar for the table specifically */
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                  height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background-color: rgba(156, 163, 175, 0.5);
                  border-radius: 20px;
                }
              `}</style>
            </form>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Product
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDatabase;