import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, RefreshCw, QrCode, AlertTriangle, Users, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Table } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

const BASE_ORDER_URL = window.location.origin;

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<Table | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [resettingTable, setResettingTable] = useState<string | null>(null);
  const [deletingTable, setDeletingTable] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
    const channel = supabase
      .channel('tables-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTables)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (showQRModal) {
      generateQR(showQRModal);
    }
  }, [showQRModal]);

  async function fetchTables() {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .order('table_number');
    if (data) setTables(data);
    setLoading(false);
  }

  async function generateQR(table: Table) {
    const url = `${BASE_ORDER_URL}/order?t=${table.table_number}&s=${table.secret_token}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: '#1C1917', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error(err);
    }
  }

  async function downloadQR(table: Table) {
    const url = `${BASE_ORDER_URL}/order?t=${table.table_number}&s=${table.secret_token}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 800, margin: 2 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `table-${table.table_number}-qr.png`;
    link.click();
    toast.success(`QR code downloaded for Table ${table.table_number}`);
  }

  async function downloadAllQR() {
    for (const table of tables) {
      await downloadQR(table);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async function resetTable(tableId: string) {
    if (!confirm('Reset this table? This will close the current session.')) return;
    setResettingTable(tableId);
    try {
      await supabase.rpc('reset_table', { p_table_id: tableId });
      toast.success('Table reset successfully');
      fetchTables();
    } catch {
      toast.error('Failed to reset table');
    } finally {
      setResettingTable(null);
    }
  }

  async function deleteTable(tableId: string, tableNumber: number) {
    if (
      !confirm(
        `Are you sure you want to delete Table ${tableNumber}? This will clear table and session references from orders and delete all associated sessions.`
      )
    ) {
      return;
    }
    setDeletingTable(tableId);
    try {
      // 1. Get all session IDs for this table
      const { data: sessions } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', tableId);

      const sessionIds = sessions?.map((s) => s.id) || [];

      // 2. Clear foreign key references in orders to avoid constraint blocking
      if (sessionIds.length > 0) {
        await supabase
          .from('orders')
          .update({ table_id: null, session_id: null })
          .in('session_id', sessionIds);
      }

      await supabase
        .from('orders')
        .update({ table_id: null })
        .eq('table_id', tableId);

      // 3. Delete the table sessions
      await supabase
        .from('table_sessions')
        .delete()
        .eq('table_id', tableId);

      // 4. Delete the table itself
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;

      toast.success(`Table ${tableNumber} deleted successfully`);
      fetchTables();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete table');
    } finally {
      setDeletingTable(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-primary">Tables</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadAllQR}>
            Download All QR
          </Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModal(true)}>
            Add Table
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Tables', value: tables.length },
          { label: 'Occupied', value: tables.filter((t) => t.status === 'occupied').length },
          { label: 'Free', value: tables.filter((t) => t.status === 'free').length },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface rounded-2xl p-4 shadow-card text-center">
            <p className="font-display text-2xl font-bold text-primary tabular-nums">{stat.value}</p>
            <p className="text-xs text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table, i) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'bg-surface rounded-2xl p-4 shadow-card border-2 transition-all',
                table.status === 'occupied'
                  ? 'border-amber-300 dark:border-amber-700'
                  : 'border-transparent'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {table.status === 'occupied' && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 pulse-dot" />
                    )}
                    <span className="font-display font-bold text-xl text-primary">{table.table_number}</span>
                  </div>
                  <p className="text-xs text-secondary capitalize">{table.status}</p>
                </div>
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center',
                  table.status === 'occupied' ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-stone-100 dark:bg-stone-800'
                )}>
                  <Users className={cn('w-4 h-4', table.status === 'occupied' ? 'text-amber-600' : 'text-secondary')} />
                </div>
              </div>

              {table.table_name && (
                <p className="text-xs text-secondary mb-2 truncate">{table.table_name}</p>
              )}

              {table.location && (
                <p className="text-xs text-secondary mb-2 truncate">{table.location}</p>
              )}

              <p className="text-xs text-secondary mb-3">Capacity: {table.capacity}</p>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setShowQRModal(table)}
                  className="w-full py-1.5 rounded-lg bg-stone-100 dark:bg-stone-700 text-xs font-medium text-primary hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3 h-3" />
                  View QR
                </button>
                <button
                  onClick={() => downloadQR(table)}
                  className="w-full py-1.5 rounded-lg bg-stone-100 dark:bg-stone-700 text-xs font-medium text-primary hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
                <button
                  onClick={() => setEditingTable(table)}
                  className="w-full py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit Table
                </button>
                {table.status === 'occupied' && (
                  <button
                    onClick={() => resetTable(table.id)}
                    disabled={resettingTable === table.id}
                    className="w-full py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-xs font-medium text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={cn('w-3 h-3', resettingTable === table.id && 'animate-spin')} />
                    Reset Table
                  </button>
                )}
                <button
                  onClick={() => deleteTable(table.id, table.table_number)}
                  disabled={deletingTable === table.id}
                  className="w-full py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className={cn('w-3 h-3', deletingTable === table.id && 'animate-spin')} />
                  {deletingTable === table.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      <Modal isOpen={!!showQRModal} onClose={() => setShowQRModal(null)} title={`Table ${showQRModal?.table_number} QR Code`} size="sm">
        {showQRModal && (
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-inner border border-default">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 skeleton rounded-xl" />
              )}
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-primary">Table {showQRModal.table_number}</p>
              {showQRModal.table_name && <p className="text-sm text-secondary">{showQRModal.table_name}</p>}
              <p className="text-xs text-secondary mt-1">Capacity: {showQRModal.capacity} guests</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button fullWidth variant="secondary" onClick={() => setShowQRModal(null)}>Close</Button>
              <Button fullWidth icon={<Download className="w-3.5 h-3.5" />} onClick={() => downloadQR(showQRModal)}>
                Download
              </Button>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl w-full">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                This QR code contains a secret token. Keep it secure and regenerate if compromised.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Table Modal */}
      <Modal isOpen={!!editingTable} onClose={() => setEditingTable(null)} title="Edit Table" size="sm">
        {editingTable && (
          <EditTableForm
            table={editingTable}
            onSave={() => { setEditingTable(null); fetchTables(); }}
            onClose={() => setEditingTable(null)}
          />
        )}
      </Modal>

      {/* Add Table Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Table" size="sm">
        <AddTableForm
          onSave={() => { setShowAddModal(false); fetchTables(); }}
          onClose={() => setShowAddModal(false)}
          existingNumbers={tables.map((t) => t.table_number)}
        />
      </Modal>
    </div>
  );
}

function AddTableForm({
  onSave,
  onClose,
  existingNumbers,
}: {
  onSave: () => void;
  onClose: () => void;
  existingNumbers: number[];
}) {
  const nextNumber = Math.max(0, ...existingNumbers) + 1;
  const [tableNumber, setTableNumber] = useState(nextNumber.toString());
  const [tableName, setTableName] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const num = parseInt(tableNumber);
    if (!num || existingNumbers.includes(num)) {
      toast.error(existingNumbers.includes(num) ? 'Table number already exists' : 'Invalid table number');
      return;
    }
    setSaving(true);
    try {
      await supabase.from('tables').insert({
        table_number: num,
        table_name: tableName || null,
        capacity: parseInt(capacity) || 4,
        location: location || null,
        status: 'free',
        is_active: true,
      });
      toast.success('Table added successfully');
      onSave();
    } catch {
      toast.error('Failed to add table');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Table Number *</label>
          <input type="number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Capacity</label>
          <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-primary mb-1">Table Name (optional)</label>
          <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g., Window Table, Corner Table" className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-primary mb-1">Location (optional)</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Indoor, Outdoor, Terrace" className="input-base" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button fullWidth loading={saving} onClick={handleSave}>Add Table</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function EditTableForm({
  table,
  onSave,
  onClose,
}: {
  table: Table;
  onSave: () => void;
  onClose: () => void;
}) {
  const [tableName, setTableName] = useState(table.table_name || '');
  const [capacity, setCapacity] = useState(table.capacity.toString());
  const [location, setLocation] = useState(table.location || '');
  const [isActive, setIsActive] = useState(table.is_active);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tables')
        .update({
          table_name: tableName || null,
          capacity: parseInt(capacity) || 4,
          location: location || null,
          is_active: isActive,
        })
        .eq('id', table.id);

      if (error) throw error;
      toast.success(`Table ${table.table_number} updated`);
      onSave();
    } catch {
      toast.error('Failed to update table');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3 text-center">
        <p className="text-2xl font-bold font-display text-primary">Table {table.table_number}</p>
        <p className="text-xs text-secondary mt-0.5 capitalize">{table.status}</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Table Name</label>
          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="e.g., Window Table, Corner Table"
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Capacity</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Indoor, Outdoor, Terrace"
            className="input-base"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded accent-amber-600"
          />
          <span className="text-sm text-primary">Table is active (visible to customers)</span>
        </label>
      </div>
      <div className="flex gap-3">
        <Button fullWidth loading={saving} onClick={handleSave}>Save Changes</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
