import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal,
  ScrollView, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';
import RazorpayCheckout from '../../components/RazorpayCheckout';

const BILLING_LABEL = { monthly: '/ month', quarterly: '/ quarter', yearly: '/ year' };

const STATUS_COLOR = {
  pending:  '#f59e0b',
  active:   '#22c55e',
  expired:  '#9ca3af',
  rejected: '#ef4444',
};

/* ══════════════════════════════════════════════════════════════════
   PACKAGE FORM MODAL
══════════════════════════════════════════════════════════════════ */
function PackageFormModal({ visible, editItem, type, onClose, onSaved, theme }) {
  const isPackage = type === 'package';
  const editing = !!editItem?._id;

  const [name, setName]             = useState('');
  const [icon, setIcon]             = useState('');
  const [description, setDesc]      = useState('');
  const [tag, setTag]               = useState('');

  // Package fields
  const [services, setServices]     = useState([]);
  const [origPrice, setOrigPrice]   = useState('');
  const [discPrice, setDiscPrice]   = useState('');
  const [discPct, setDiscPct]       = useState('');
  const [duration, setDuration]     = useState('');

  // Membership fields
  const [price, setPrice]           = useState('');
  const [billingCycle, setBilling]  = useState('monthly');
  const [durationDays, setDays]     = useState('30');
  const [benefitDisc, setBenefitDisc] = useState('');
  const [priorityBook, setPriority] = useState(false);
  const [freeServices, setFreeServices] = useState([]);

  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name || '');
      setIcon(editItem.icon || (isPackage ? '🎁' : '💳'));
      setDesc(editItem.description || '');
      setTag(editItem.tag || '');
      if (isPackage) {
        setServices((editItem.services || []).map(s => ({ serviceName: s.serviceName, price: String(s.price || ''), duration: String(s.duration || '') })));
        setOrigPrice(String(editItem.originalPrice || ''));
        setDiscPrice(String(editItem.discountedPrice || ''));
        setDiscPct(String(editItem.discountPercent || ''));
        setDuration(String(editItem.totalDuration || ''));
      } else {
        setPrice(String(editItem.price || ''));
        setBilling(editItem.billingCycle || 'monthly');
        setDays(String(editItem.durationDays || '30'));
        setBenefitDisc(String(editItem.benefits?.discountPercent || ''));
        setPriority(editItem.benefits?.priorityBooking || false);
        setFreeServices((editItem.benefits?.freeServices || []).map(fs => ({ serviceName: fs.serviceName, usageLimit: String(fs.usageLimit || 1) })));
      }
    } else {
      setName(''); setIcon(isPackage ? '🎁' : '💳'); setDesc(''); setTag('');
      setServices([]); setOrigPrice(''); setDiscPrice(''); setDiscPct(''); setDuration('');
      setPrice(''); setBilling('monthly'); setDays('30'); setBenefitDisc(''); setPriority(false); setFreeServices([]);
    }
  }, [editItem, visible, isPackage]);

  const recalcDiscount = (orig, disc) => {
    const o = parseFloat(orig) || 0;
    const d = parseFloat(disc) || 0;
    if (o > 0 && d > 0 && d < o) setDiscPct(String(Math.round(((o - d) / o) * 100)));
    else setDiscPct('');
  };

  const addService = () => setServices(prev => [...prev, { serviceName: '', price: '', duration: '' }]);
  const removeService = i => setServices(prev => prev.filter((_, idx) => idx !== i));
  const updateService = (i, field, val) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: val };
    if (field === 'price' || field === 'duration') {
      const totalOrig = updated.reduce((s, sv) => s + (parseFloat(sv.price) || 0), 0);
      const totalDur  = updated.reduce((s, sv) => s + (parseInt(sv.duration) || 0), 0);
      setOrigPrice(totalOrig ? String(totalOrig) : '');
      setDuration(totalDur ? String(totalDur) : '');
      recalcDiscount(totalOrig ? String(totalOrig) : origPrice, discPrice);
    }
    setServices(updated);
  };

  const addFreeService = () => setFreeServices(prev => [...prev, { serviceName: '', usageLimit: '1' }]);
  const removeFreeService = i => setFreeServices(prev => prev.filter((_, idx) => idx !== i));
  const updateFreeService = (i, field, val) => {
    const updated = [...freeServices];
    updated[i] = { ...updated[i], [field]: val };
    setFreeServices(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) { showError('Error', 'Name is required'); return; }
    if (isPackage && !discPrice) { showError('Error', 'Offer price is required'); return; }
    if (!isPackage && !price) { showError('Error', 'Price is required'); return; }

    setSaving(true);
    try {
      const payload = {
        type, name: name.trim(), description: description.trim(), icon, tag,
        ...(isPackage ? {
          services: services.map(s => ({ serviceName: s.serviceName, price: Number(s.price) || 0, duration: Number(s.duration) || 0 })),
          originalPrice:   Number(origPrice) || 0,
          discountedPrice: Number(discPrice) || 0,
          discountPercent: Number(discPct)   || 0,
          totalDuration:   Number(duration)  || 0,
        } : {
          price: Number(price),
          billingCycle,
          durationDays: Number(durationDays) || 30,
          benefits: {
            freeServices: freeServices.map(fs => ({ serviceName: fs.serviceName, usageLimit: Number(fs.usageLimit) || 1 })),
            discountPercent: Number(benefitDisc) || 0,
            priorityBooking: priorityBook,
          },
        }),
      };

      if (editing) {
        await api.put(`/owner/packages/${editItem._id}`, payload);
        showSuccess('Updated', `${isPackage ? 'Package' : 'Membership'} updated`);
      } else {
        await api.post('/owner/packages', payload);
        showSuccess('Created', `${isPackage ? 'Package' : 'Membership'} created`);
      }
      onSaved(); onClose();
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const accentColor = isPackage ? '#6366f1' : '#7c3aed';
  const iColor = { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.card };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { backgroundColor: theme.bg }]}>
          {/* Header */}
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>
              {editing ? 'Edit' : 'Create'} {isPackage ? 'Package' : 'Membership'}
            </Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Icon + Name */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TextInput
                style={[s.input, iColor, { width: 56, textAlign: 'center', fontSize: 22 }]}
                value={icon} onChangeText={setIcon} maxLength={2}
              />
              <TextInput
                style={[s.input, iColor, { flex: 1 }]}
                placeholder="Name *" placeholderTextColor={theme.subText}
                value={name} onChangeText={setName}
              />
            </View>

            {/* Description */}
            <TextInput
              style={[s.input, iColor, { height: 68, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="Description (optional)" placeholderTextColor={theme.subText}
              value={description} onChangeText={setDesc} multiline
            />

            {/* Tag */}
            <Text style={[s.fieldLabel, { color: theme.subText }]}>Badge Tag</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {[['', 'None'], ['popular', '🔥 Popular'], ['recommended', '⭐ Recommended'], ['best_value', '💰 Best Value']].map(([v, l]) => (
                <TouchableOpacity key={v} onPress={() => setTag(v)}
                  style={[s.tagBtn, { borderColor: tag === v ? accentColor : (theme.border || '#e5e7eb'), backgroundColor: tag === v ? accentColor : 'transparent' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: tag === v ? '#fff' : theme.subText }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isPackage ? (
              <>
                {/* Services */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[s.fieldLabel, { color: theme.subText, marginBottom: 0 }]}>Services</Text>
                  <TouchableOpacity onPress={addService}>
                    <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>+ Add</Text>
                  </TouchableOpacity>
                </View>
                {services.map((svc, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                    <TextInput style={[s.input, iColor, { flex: 1, marginBottom: 0 }]} placeholder="Service name"
                      placeholderTextColor={theme.subText} value={svc.serviceName} onChangeText={v => updateService(i, 'serviceName', v)} />
                    <TextInput style={[s.input, iColor, { width: 64, marginBottom: 0 }]} placeholder="₹"
                      placeholderTextColor={theme.subText} keyboardType="numeric" value={svc.price} onChangeText={v => updateService(i, 'price', v)} />
                    <TextInput style={[s.input, iColor, { width: 52, marginBottom: 0 }]} placeholder="min"
                      placeholderTextColor={theme.subText} keyboardType="numeric" value={svc.duration} onChangeText={v => updateService(i, 'duration', v)} />
                    <TouchableOpacity onPress={() => removeService(i)} style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {services.length === 0 && (
                  <Text style={{ color: theme.subText, fontSize: 12, textAlign: 'center', marginBottom: 10 }}>Add services included in this package</Text>
                )}

                {/* Pricing */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: theme.subText }]}>Original ₹</Text>
                    <TextInput style={[s.input, iColor]} placeholder="Auto" placeholderTextColor={theme.subText}
                      keyboardType="numeric" value={origPrice}
                      onChangeText={v => { setOrigPrice(v); recalcDiscount(v, discPrice); }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: theme.subText }]}>Offer ₹ *</Text>
                    <TextInput style={[s.input, iColor]} placeholder="e.g. 499" placeholderTextColor={theme.subText}
                      keyboardType="numeric" value={discPrice}
                      onChangeText={v => { setDiscPrice(v); recalcDiscount(origPrice, v); }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: theme.subText }]}>Disc %</Text>
                    <TextInput style={[s.input, { borderColor: theme.border || '#e5e7eb', color: '#22c55e', backgroundColor: theme.card, marginBottom: 0 }]}
                      value={discPct} editable={false} placeholder="Auto" placeholderTextColor={theme.subText} />
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Price + Billing */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: theme.subText }]}>Price ₹ *</Text>
                    <TextInput style={[s.input, iColor]} placeholder="e.g. 999" placeholderTextColor={theme.subText}
                      keyboardType="numeric" value={price} onChangeText={setPrice} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: theme.subText }]}>Validity (days)</Text>
                    <TextInput style={[s.input, iColor]} placeholder="30" placeholderTextColor={theme.subText}
                      keyboardType="numeric" value={durationDays} onChangeText={setDays} />
                  </View>
                </View>

                {/* Billing cycle */}
                <Text style={[s.fieldLabel, { color: theme.subText }]}>Billing Cycle</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {['monthly', 'quarterly', 'yearly'].map(bc => (
                    <TouchableOpacity key={bc} onPress={() => setBilling(bc)}
                      style={[s.tagBtn, { borderColor: billingCycle === bc ? accentColor : (theme.border || '#e5e7eb'), backgroundColor: billingCycle === bc ? accentColor : 'transparent' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: billingCycle === bc ? '#fff' : theme.subText, textTransform: 'capitalize' }}>{bc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Benefits */}
                <Text style={[s.fieldLabel, { color: theme.subText }]}>Benefits</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <TextInput style={[s.input, iColor, { width: 64, marginBottom: 0 }]} placeholder="0%"
                    placeholderTextColor={theme.subText} keyboardType="numeric" value={benefitDisc} onChangeText={setBenefitDisc} />
                  <Text style={{ color: theme.subText, fontSize: 13 }}>% discount on all services</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <Switch value={priorityBook} onValueChange={setPriority} trackColor={{ true: accentColor }} />
                  <Text style={{ color: theme.text, fontSize: 13 }}>Priority booking</Text>
                </View>

                {/* Free services */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[s.fieldLabel, { color: theme.subText, marginBottom: 0 }]}>Free Services (per period)</Text>
                  <TouchableOpacity onPress={addFreeService}>
                    <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>+ Add</Text>
                  </TouchableOpacity>
                </View>
                {freeServices.map((fs, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                    <TextInput style={[s.input, iColor, { flex: 1, marginBottom: 0 }]} placeholder="Service name"
                      placeholderTextColor={theme.subText} value={fs.serviceName} onChangeText={v => updateFreeService(i, 'serviceName', v)} />
                    <TextInput style={[s.input, iColor, { width: 52, marginBottom: 0 }]} placeholder="×1"
                      placeholderTextColor={theme.subText} keyboardType="numeric" value={fs.usageLimit} onChangeText={v => updateFreeService(i, 'usageLimit', v)} />
                    <TouchableOpacity onPress={() => removeFreeService(i)} style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          {/* Save button */}
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: accentColor, marginTop: 12, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave} disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : (editing ? 'Update' : 'Create')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
/* ── Notify (broadcast) modal ─────────────────────────────────── */
const AUDIENCE_OPTIONS = [
  { id: 'my_customers', label: 'My Customers', sub: 'Always free' },
  { id: 'radius_5km',   label: 'Within 5 km',  sub: 'Nearby customers' },
  { id: 'radius_10km',  label: 'Within 10 km', sub: 'Wider reach' },
  { id: 'radius_25km',  label: 'Within 25 km', sub: 'Maximum reach' },
];

function NotifyModal({ pkg, visible, onClose, theme, isDark, user }) {
  const [title, setTitle]       = useState('');
  const [message, setMessage]   = useState('');
  const [targetType, setTargetType] = useState('my_customers');
  const [targetGender, setTargetGender] = useState('both');
  const [settings, setSettings] = useState(null);
  const [preview, setPreview]   = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending]   = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const pendingCampaign = React.useRef(null);

  useEffect(() => {
    if (!visible || !pkg) return;
    setTitle(`Check out ${pkg.name}!`);
    setMessage('');
    setTargetType('my_customers');
    setPreview(null);
    api.get('/owner/notification-settings').then(r => {
      const d = r.data.data;
      setSettings(d);
      if (d?.salonServedGender === 'male') setTargetGender('male');
      else if (d?.salonServedGender === 'female') setTargetGender('female');
      else setTargetGender('both');
    }).catch(() => {});
  }, [visible, pkg]);

  // preview when audience changes
  useEffect(() => {
    if (!visible || !pkg) return;
    setPreviewing(true);
    setPreview(null);
    api.post(`/owner/packages/${pkg._id}/notify`, { targetType, targetGender, preview: true })
      .then(r => setPreview(r.data.data))
      .catch(() => setPreview({ estimatedCount: 0, isFree: true, amount: 0 }))
      .finally(() => setPreviewing(false));
  }, [targetType, targetGender, visible, pkg]);

  const priceLabel = (id) => {
    if (id === 'my_customers') return 'Free';
    if (!settings) return '';
    const map = { radius_5km: settings.pricing?.radius5km, radius_10km: settings.pricing?.radius10km, radius_25km: settings.pricing?.radius25km };
    const p = map[id];
    if (p === 0 || settings.freeRadiusRemaining > 0) return 'Free';
    return p != null ? `₹${p}` : '';
  };

  const finishCampaign = (notifiedCount) => {
    showSuccess('Sent!', `Notified ${notifiedCount ?? 0} customer${notifiedCount === 1 ? '' : 's'}`);
    setSending(false);
    onClose();
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { showError('Required', 'Title and message are required'); return; }
    setSending(true);
    try {
      const res = await api.post(`/owner/packages/${pkg._id}/notify`, { title: title.trim(), message: message.trim(), targetType, targetGender });
      if (res.data.needsPayment) {
        // Online payments temporarily disabled for launch (cash-only phase). Re-enable with Razorpay Route.
        showError('Unavailable', 'Paid broadcasts are temporarily unavailable. Free broadcasts still work.');
        setSending(false);
        return;
      }
      finishCampaign(res.data.notifiedCount);
    } catch (err) {
      showError('Failed', err.response?.data?.message || 'Failed to send');
      setSending(false);
    }
  };

  const onPaySuccess = async (response) => {
    setCheckoutOrder(null);
    try {
      const vRes = await api.post(`/owner/notification-campaigns/${pendingCampaign.current}/verify-payment`, {
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      finishCampaign(vRes.data.notifiedCount);
    } catch {
      showError('Verification failed', 'Payment done but notification failed. Contact support.');
      setSending(false);
    } finally {
      pendingCampaign.current = null;
    }
  };

  if (!pkg) return null;
  const isUnisex = (settings?.salonServedGender || 'unisex') === 'unisex';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.notifyOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.notifySheet, { backgroundColor: theme.bg }]}>
          <View style={s.notifyHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="megaphone-outline" size={16} color="#f59e0b" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>Broadcast</Text>
                <Text style={{ fontSize: 11, color: theme.subText }} numberOfLines={1}>{pkg.name}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.subText} /></TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[s.notifyLabel, { color: theme.text }]}>Title</Text>
            <TextInput style={[s.notifyInput, { backgroundColor: theme.input || theme.cardAlt, borderColor: theme.border, color: theme.text }]}
              value={title} onChangeText={setTitle} placeholder="Notification title" placeholderTextColor={theme.subText} />

            <Text style={[s.notifyLabel, { color: theme.text }]}>Message</Text>
            <TextInput style={[s.notifyInput, { height: 80, textAlignVertical: 'top', backgroundColor: theme.input || theme.cardAlt, borderColor: theme.border, color: theme.text }]}
              value={message} onChangeText={setMessage} placeholder="Write your offer message…" placeholderTextColor={theme.subText} multiline />

            <Text style={[s.notifyLabel, { color: theme.text }]}>Audience</Text>
            {AUDIENCE_OPTIONS.map(opt => {
              const active = targetType === opt.id;
              return (
                <TouchableOpacity key={opt.id} onPress={() => setTargetType(opt.id)}
                  style={[s.audienceRow, { borderColor: active ? '#f59e0b' : theme.border, backgroundColor: active ? (isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb') : 'transparent' }]}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={18} color={active ? '#f59e0b' : theme.subText} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>{opt.label}</Text>
                    <Text style={{ fontSize: 11, color: theme.subText }}>{opt.sub}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: priceLabel(opt.id) === 'Free' ? '#10b981' : '#f59e0b' }}>{priceLabel(opt.id)}</Text>
                </TouchableOpacity>
              );
            })}

            {isUnisex && (
              <>
                <Text style={[s.notifyLabel, { color: theme.text }]}>Send to</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[{ v: 'both', l: 'Everyone' }, { v: 'male', l: 'Men' }, { v: 'female', l: 'Women' }].map(g => (
                    <TouchableOpacity key={g.v} onPress={() => setTargetGender(g.v)}
                      style={[s.genderChip, { borderColor: targetGender === g.v ? '#f59e0b' : theme.border, backgroundColor: targetGender === g.v ? 'rgba(245,158,11,0.1)' : 'transparent' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: targetGender === g.v ? '#f59e0b' : theme.subText }}>{g.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={[s.previewBox, { backgroundColor: theme.cardAlt || theme.card, borderColor: theme.border }]}>
              {previewing ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Text style={{ fontSize: 12, color: theme.subText }}>
                  Reaches ~<Text style={{ fontWeight: '800', color: theme.text }}>{preview?.estimatedCount ?? 0}</Text> customers
                  {preview && !preview.isFree && preview.amount > 0 ? ` · ₹${preview.amount}` : ' · Free'}
                </Text>
              )}
            </View>

            <TouchableOpacity style={[s.notifySend, { opacity: sending ? 0.6 : 1 }]} onPress={handleSend} disabled={sending}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="send" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    {preview && !preview.isFree && preview.amount > 0 ? `Pay ₹${preview.amount} & Send` : 'Send Notification'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <RazorpayCheckout
        visible={!!checkoutOrder}
        order={checkoutOrder}
        prefill={{ name: user?.name || '', contact: user?.phone || '', email: user?.email || '' }}
        description={`Broadcast: ${pkg.name}`}
        onSuccess={onPaySuccess}
        onDismiss={() => { setCheckoutOrder(null); setSending(false); pendingCampaign.current = null; }}
        onFailure={() => { setCheckoutOrder(null); setSending(false); showError('Payment failed'); }}
      />
    </Modal>
  );
}

export default function PackagesScreen() {
  const navigation  = useNavigation();
  const { theme, isDark } = useTheme();
  const { user }    = useAuth();
  const insets      = useSafeAreaInsets();

  const [notifyTarget, setNotifyTarget] = useState(null);
  const [activeTab, setActiveTab]   = useState('packages');  // 'packages' | 'memberships' | 'requests'
  const [items, setItems]           = useState([]);
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [reqLoading, setReqLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [formType, setFormType]     = useState('package');
  const [editItem, setEditItem]     = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  /* ── fetch ─────────────────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    try {
      const [pkgRes, memRes] = await Promise.all([
        api.get('/owner/packages?type=package'),
        api.get('/owner/packages?type=membership'),
      ]);
      setItems([
        ...(pkgRes.data.data?.packages || []),
        ...(memRes.data.data?.packages || []),
      ]);
    } catch { showError('Error', 'Failed to load packages'); }
    finally { setLoading(false); }
  }, []);

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await api.get('/owner/package-requests');
      setRequests(res.data.data?.requests || []);
    } catch { showError('Error', 'Failed to load requests'); }
    finally { setReqLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { if (activeTab === 'requests') fetchRequests(); }, [activeTab, fetchRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'requests') await fetchRequests(); else await fetchItems();
    setRefreshing(false);
  };

  /* ── toggle active ─────────────────────────────────────────── */
  const toggleActive = async (item) => {
    try {
      await api.put(`/owner/packages/${item._id}`, { isActive: !item.isActive });
      setItems(prev => prev.map(p => p._id === item._id ? { ...p, isActive: !p.isActive } : p));
    } catch { showError('Error', 'Failed to update'); }
  };

  /* ── delete ────────────────────────────────────────────────── */
  const handleDelete = (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/owner/packages/${id}`);
            setItems(prev => prev.filter(p => p._id !== id));
            showSuccess('Deleted', 'Removed successfully');
          } catch { showError('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  /* ── confirm / reject request ──────────────────────────────── */
  const handleRequestAction = async (id, action) => {
    setConfirmingId(id);
    try {
      await api.put(`/owner/package-requests/${id}`, { action });
      showSuccess(action === 'confirm' ? 'Activated!' : 'Rejected', action === 'confirm' ? 'Package activated for customer' : 'Request rejected');
      fetchRequests();
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed');
    } finally { setConfirmingId(null); }
  };

  /* ── derived ────────────────────────────────────────────────── */
  const packages    = items.filter(i => i.type === 'package');
  const memberships = items.filter(i => i.type === 'membership');
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  /* ── render helpers ─────────────────────────────────────────── */
  const renderPackage = ({ item }) => (
    <View style={[s.card, { backgroundColor: theme.card, borderColor: item.isActive ? '#818cf8' : (theme.border || '#e5e7eb'), opacity: item.isActive ? 1 : 0.55 }]}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>{item.icon || '🎁'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{item.name}</Text>
          {item.description ? <Text style={{ fontSize: 12, color: theme.subText }} numberOfLines={1}>{item.description}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#6366f1' }}>₹{item.discountedPrice}</Text>
        {item.originalPrice > 0 && item.originalPrice !== item.discountedPrice && (
          <>
            <Text style={{ fontSize: 13, color: theme.subText, textDecorationLine: 'line-through' }}>₹{item.originalPrice}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>{item.discountPercent}% OFF</Text>
          </>
        )}
      </View>
      {item.services?.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {item.services.slice(0, 4).map((svc, i) => (
            <View key={i} style={{ backgroundColor: theme.bg || '#f9fafb', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: theme.subText }}>{svc.serviceName}</Text>
            </View>
          ))}
          {item.services.length > 4 && <Text style={{ fontSize: 11, color: theme.subText, alignSelf: 'center' }}>+{item.services.length - 4} more</Text>}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border || '#f3f4f6', paddingTop: 8, gap: 8 }}>
        <Switch value={item.isActive} onValueChange={() => toggleActive(item)} trackColor={{ true: '#6366f1' }} style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }} />
        <Text style={{ fontSize: 11, color: theme.subText, flex: 1 }}>{item.isActive ? 'Active' : 'Off'}</Text>
        <TouchableOpacity onPress={() => setNotifyTarget(item)} style={s.iconBtn}>
          <Ionicons name="megaphone-outline" size={18} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setEditItem(item); setFormType('package'); setShowForm(true); }} style={s.iconBtn}>
          <Ionicons name="create-outline" size={18} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item._id)} style={s.iconBtn}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMembership = ({ item }) => (
    <View style={[s.card, { backgroundColor: theme.card, borderColor: item.isActive ? '#a78bfa' : (theme.border || '#e5e7eb'), opacity: item.isActive ? 1 : 0.55 }]}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>{item.icon || '💳'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{item.name}</Text>
          {item.description ? <Text style={{ fontSize: 12, color: theme.subText }} numberOfLines={1}>{item.description}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#7c3aed' }}>₹{item.price}</Text>
        <Text style={{ fontSize: 12, color: theme.subText }}>{BILLING_LABEL[item.billingCycle] || '/month'}</Text>
      </View>
      <Text style={{ fontSize: 11, color: theme.subText, marginBottom: 8 }}>Valid for {item.durationDays} days</Text>
      <View style={{ gap: 4, marginBottom: 8 }}>
        {item.benefits?.discountPercent > 0 && (
          <Text style={{ fontSize: 12, color: theme.subText }}>🏷 {item.benefits.discountPercent}% off all services</Text>
        )}
        {item.benefits?.priorityBooking && (
          <Text style={{ fontSize: 12, color: theme.subText }}>⚡ Priority booking</Text>
        )}
        {(item.benefits?.freeServices || []).slice(0, 3).map((fs, i) => (
          <Text key={i} style={{ fontSize: 12, color: theme.subText }}>✓ {fs.serviceName} × {fs.usageLimit}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border || '#f3f4f6', paddingTop: 8, gap: 8 }}>
        <Switch value={item.isActive} onValueChange={() => toggleActive(item)} trackColor={{ true: '#7c3aed' }} style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }} />
        <Text style={{ fontSize: 11, color: theme.subText, flex: 1 }}>{item.isActive ? 'Active' : 'Off'}</Text>
        <TouchableOpacity onPress={() => setNotifyTarget(item)} style={s.iconBtn}>
          <Ionicons name="megaphone-outline" size={18} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setEditItem(item); setFormType('membership'); setShowForm(true); }} style={s.iconBtn}>
          <Ionicons name="create-outline" size={18} color="#7c3aed" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item._id)} style={s.iconBtn}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequest = ({ item }) => (
    <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border || '#e5e7eb' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLOR[item.status] || '#9ca3af' }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{item.customerName}</Text>
          <Text style={{ fontSize: 12, color: theme.subText }}>{item.packageName}</Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#6366f1' }}>₹{item.pricePaid}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {[
          ['Type', item.type],
          ['Status', item.status],
          ['Phone', item.customerPhone || '—'],
          ['Date', new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })],
        ].map(([label, value]) => (
          <View key={label} style={{ backgroundColor: theme.bg || '#f9fafb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, minWidth: 90 }}>
            <Text style={{ fontSize: 10, color: theme.subText }}>{label}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text, textTransform: 'capitalize' }}>{value}</Text>
          </View>
        ))}
      </View>
      {item.purchaseNote ? (
        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 8, fontStyle: 'italic' }}>"{item.purchaseNote}"</Text>
      ) : null}
      {item.status === 'pending' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleRequestAction(item._id, 'reject')}
            disabled={confirmingId === item._id}
            style={[s.actionBtn, { borderWidth: 1.5, borderColor: '#ef4444', opacity: confirmingId === item._id ? 0.5 : 1 }]}
          >
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRequestAction(item._id, 'confirm')}
            disabled={confirmingId === item._id}
            style={[s.actionBtn, { backgroundColor: '#16a34a', flex: 1, opacity: confirmingId === item._id ? 0.5 : 1 }]}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              {confirmingId === item._id ? 'Processing…' : 'Confirm Payment'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const currentData   = activeTab === 'packages' ? packages : activeTab === 'memberships' ? memberships : requests;
  const currentRender = activeTab === 'packages' ? renderPackage : activeTab === 'memberships' ? renderMembership : renderRequest;
  const isLoadingTab  = (activeTab === 'requests') ? reqLoading : loading;

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Packages & Plans</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={s.headerSub}>Create bundles and subscriptions</Text>
      </View>

      {/* Tabs */}
      <View style={[s.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border || '#e5e7eb' }]}>
        {[
          { id: 'packages',    label: 'Packages'    },
          { id: 'memberships', label: 'Memberships' },
          { id: 'requests',    label: 'Requests', badge: pendingCount },
        ].map(({ id, label, badge }) => (
          <TouchableOpacity key={id} onPress={() => setActiveTab(id)} style={[s.tabBtn, activeTab === id && s.tabBtnActive]}>
            <Text style={[s.tabText, { color: activeTab === id ? '#6366f1' : theme.subText }]}>{label}</Text>
            {badge > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoadingTab ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={item => item._id}
          renderItem={currentRender}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons
                name={activeTab === 'packages' ? 'gift-outline' : activeTab === 'memberships' ? 'card-outline' : 'document-text-outline'}
                size={52} color="#d1d5db"
              />
              <Text style={{ color: theme.subText, marginTop: 10, fontSize: 15, fontWeight: '600' }}>
                {activeTab === 'packages' ? 'No packages yet' : activeTab === 'memberships' ? 'No memberships yet' : 'No requests yet'}
              </Text>
              {activeTab !== 'requests' && (
                <TouchableOpacity
                  onPress={() => { setEditItem(null); setFormType(activeTab === 'packages' ? 'package' : 'membership'); setShowForm(true); }}
                  style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#6366f1', borderRadius: 12 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Create {activeTab === 'packages' ? 'Package' : 'Membership'}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* FABs — only on packages/memberships tabs */}
      {activeTab !== 'requests' && (
        <TouchableOpacity
          style={[s.fab, { bottom: insets.bottom + 20, backgroundColor: activeTab === 'packages' ? '#6366f1' : '#7c3aed' }]}
          onPress={() => { setEditItem(null); setFormType(activeTab === 'packages' ? 'package' : 'membership'); setShowForm(true); }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Form Modal */}
      <PackageFormModal
        visible={showForm}
        editItem={editItem}
        type={formType}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        onSaved={fetchItems}
        theme={theme}
      />

      {/* Notify Modal */}
      <NotifyModal
        pkg={notifyTarget}
        visible={!!notifyTarget}
        onClose={() => setNotifyTarget(null)}
        theme={theme}
        isDark={isDark}
        user={user}
      />
    </View>
  );
}

const s = StyleSheet.create({
  notifyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notifySheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  notifyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  notifyLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  notifyInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  audienceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  genderChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  previewBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 14, alignItems: 'center' },
  notifySend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 14, marginTop: 14, marginBottom: 10 },

  root: { flex: 1 },
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 5 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 13, fontWeight: '700' },
  badge: { backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  iconBtn: { padding: 6, borderRadius: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  tagBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
