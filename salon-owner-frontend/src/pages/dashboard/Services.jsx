import React, { useState, useEffect } from 'react';
import { Plus, LayoutList, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import ServiceCard from '../../components/Services/ServiceCard';
import ServiceModal from '../../components/Services/ServiceModal';
import EditCategoriesDrawer from '../../components/salon/EditCategoriesDrawer';
import { useSalon } from '../../hooks/useSalon';
import { UNISEX_CATEGORIES } from '../../constants/salonCategories';

/**
 * Services Page
 * 
 * Features:
 * - View all services
 * - Create new service
 * - Edit existing service
 * - Delete service
 * - Search services
 */
const Services = () => {
  const { salon, services, createService, updateService, deleteService, fetchServices, fetchSalon, updateSalon } = useSalon();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);

  // Fetch services and salon on mount — run independently so one failure doesn't block the other
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchServices();
      } catch (err) {
        setError('Failed to load services');
        console.error('Error fetching services:', err);
      } finally {
        setLoading(false);
      }
      // Fetch salon separately — failure here only affects categories display, not services list
      try {
        await fetchSalon();
      } catch (err) {
        console.error('Error fetching salon:', err);
      }
    };

    loadData();
  }, []);

  const filteredServices = services || [];

  const handleOpenModal = (service = null) => {
    setSelectedService(service);
    setIsModalOpen(true);
    setError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setError('');
  };

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');

    try {
      if (selectedService) {
        // Update service
        await updateService(selectedService._id || selectedService.id, formData);
        toast.success('Service updated successfully!');
      } else {
        // Create new service
        await createService(formData);
        toast.success('Service created successfully!');
      }

      handleCloseModal();
      await fetchServices(); // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to save service');
      console.error('Error saving service:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (serviceId, isActive) => {
    setLoading(true);
    try {
      await updateService(serviceId, { isActive });
      toast.success(isActive ? 'Service activated' : 'Service deactivated');
      await fetchServices();
    } catch (err) {
      setError(err.message || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId) => {
    setLoading(true);
    setError('');

    try {
      await deleteService(serviceId);
      toast.success('Service deleted successfully!');
      await fetchServices(); // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to delete service');
      console.error('Error deleting service:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600 mt-1">Manage your salon services</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCategoriesOpen(true)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <LayoutList className="w-4 h-4" />
              Service Menu
            </Button>
            <Button
              variant="primary"
              onClick={() => handleOpenModal(null)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            title="Error"
            description={error}
            dismissible
            onDismiss={() => setError('')}
          />
        )}


        {/* Offered Categories from Registration */}
        {salon?.offeredCategories?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Service Menu</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Serves{' '}
                  <span className="capitalize font-medium">{salon.servedGender}</span> customers
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {salon.kidsHaircut && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">👶 Kids' Haircut</span>
                )}
                {salon.atHomeServices && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">🏠 At-Home Services</span>
                )}
              </div>
            </div>
            {(() => {
              const CAT_ICON = {
                'Hair Services': '✂️', 'Hair Services (Men)': '✂️', 'Hair Services (Women)': '✂️',
                'Beard & Grooming': '🧔', 'Nail Services': '💅',
                'Skin & Face / Beauty': '🧖', 'Skin & Face (Men Grooming)': '🧴', 'Skin & Beauty': '🧖',
                'Spa & Massage': '💆', 'Spa & Relaxation': '💆', 'Body Grooming': '🧴',
                'Bridal & Events': '👰', 'Kids Services': '👶', 'At-Home Services': '🏠',
              };
              const CATEGORY_ORDER = [
                'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
                'Beard & Grooming', 'Nail Services',
                'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty',
                'Spa & Massage', 'Spa & Relaxation', 'Body Grooming',
                'Bridal & Events', 'Kids Services', 'At-Home Services',
              ];
              const MALE_ONLY_CATS   = ['Beard & Grooming', 'Body Grooming'];
              const FEMALE_ONLY_CATS = ['Bridal & Events'];
              const isUnisex = salon.servedGender === 'unisex';

              const sortedCategories = [...salon.offeredCategories].sort((a, b) => {
                const ai = CATEGORY_ORDER.indexOf(a.name);
                const bi = CATEGORY_ORDER.indexOf(b.name);
                if (ai === -1 && bi === -1) return 0;
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
              });

              const Chip = ({ sub }) => {
                const name  = typeof sub === 'string' ? sub : sub.name;
                const price = typeof sub === 'string' ? null : sub.price;
                return (
                  <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {name}{price > 0 && <span className="text-blue-600 font-medium">₹{price}</span>}
                  </span>
                );
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedCategories.map((cat, idx) => {
                    const subs = cat.subServices || [];
                    const isMaleOnlyCat   = MALE_ONLY_CATS.includes(cat.name);
                    const isFemaleOnlyCat = FEMALE_ONLY_CATS.includes(cat.name);
                    const showSplit = isUnisex && !isMaleOnlyCat && !isFemaleOnlyCat;

                    // Lookup from UNISEX_CATEGORIES to classify subs without explicit applicableFor
                    const uniCat = UNISEX_CATEGORIES.find(u => u.label === cat.name);
                    const uniMaleSet   = uniCat ? new Set(uniCat.maleSubServices)   : new Set();
                    const uniFemaleSet = uniCat ? new Set(uniCat.femaleSubServices) : new Set();

                    const classifySub = (s) => {
                      const name = typeof s === 'string' ? s : s.name;
                      const af   = (typeof s === 'object' && s.applicableFor) || [];
                      if (af.length > 0 && af.includes('male')   && !af.includes('female')) return 'male';
                      if (af.length > 0 && af.includes('female') && !af.includes('male'))   return 'female';
                      // No explicit single-gender tag — use UNISEX_CATEGORIES definition
                      const inMale   = uniMaleSet.has(name);
                      const inFemale = uniFemaleSet.has(name);
                      if (inMale && !inFemale)   return 'male';
                      if (inFemale && !inMale)   return 'female';
                      return 'both';
                    };

                    const menSubs   = showSplit ? subs.filter(s => classifySub(s) === 'male')   : [];
                    const womenSubs = showSplit ? subs.filter(s => classifySub(s) === 'female') : [];
                    const bothSubs  = showSplit ? subs.filter(s => classifySub(s) === 'both')   : [];

                    return (
                      <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                        <p className="font-medium text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                          <span>{CAT_ICON[cat.name] || '✨'}</span> {cat.name}
                          {isUnisex && isMaleOnlyCat   && <span className="text-xs text-blue-500 font-normal ml-1">👨 Men</span>}
                          {isUnisex && isFemaleOnlyCat && <span className="text-xs text-pink-500 font-normal ml-1">👩 Women</span>}
                        </p>
                        {subs.length === 0 ? (
                          <p className="text-xs text-gray-400">No sub-services selected</p>
                        ) : showSplit ? (
                          <div className="space-y-2">
                            {bothSubs.length > 0 && (
                              <div className="flex flex-wrap gap-1">{bothSubs.map((s, i) => <Chip key={i} sub={s} />)}</div>
                            )}
                            {menSubs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-blue-600 mb-1">👨 Men</p>
                                <div className="flex flex-wrap gap-1">{menSubs.map((s, i) => <Chip key={i} sub={s} />)}</div>
                              </div>
                            )}
                            {womenSubs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-pink-500 mb-1">👩 Women</p>
                                <div className="flex flex-wrap gap-1">{womenSubs.map((s, i) => <Chip key={i} sub={s} />)}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">{subs.map((s, i) => <Chip key={i} sub={s} />)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Services — grouped by category */}
        {loading && !services?.length ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? null : (() => {
          const CATEGORY_ICON = {
            'Hair Services': '✂️', 'Hair Services (Men)': '✂️', 'Hair Services (Women)': '✂️',
            'Beard & Grooming': '🧔',
            'Nail Services': '💅',
            'Skin & Face / Beauty': '🧖', 'Skin & Face (Men Grooming)': '🧴', 'Skin & Beauty': '🧖',
            'Spa & Massage': '💆', 'Spa & Relaxation': '💆',
            'Body Grooming': '🧴',
            'Bridal & Events': '👰',
            'Kids Services': '👶',
            'At-Home Services': '🏠',
          };
          const CATEGORY_ORDER = [
            'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
            'Beard & Grooming', 'Nail Services',
            'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty',
            'Spa & Massage', 'Spa & Relaxation', 'Body Grooming',
            'Bridal & Events', 'Kids Services', 'At-Home Services',
          ];

          const grouped = filteredServices.reduce((acc, svc) => {
            const cat = svc.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(svc);
            return acc;
          }, {});

          const sorted = Object.entries(grouped).sort(([a], [b]) => {
            const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1; if (bi === -1) return -1;
            return ai - bi;
          });

          return (
            <div className="space-y-2">
              {sorted.map(([cat, svcs]) => {
                const isOpen = expandedCat === cat;
                return (
                  <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedCat(isOpen ? null : cat)}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition text-left"
                    >
                      <span className="text-base">{CATEGORY_ICON[cat] || '✨'}</span>
                      <span className="text-sm font-semibold text-gray-700 flex-1">{cat}</span>
                      <span className="text-xs text-gray-400 mr-2">{svcs.length}</span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                    </button>
                    {isOpen && (() => {
                      const isUnisex = salon?.servedGender === 'unisex';

                      const renderCard = (service) => (
                        <ServiceCard
                          key={service._id || service.id}
                          service={service}
                          onEdit={handleOpenModal}
                          onDelete={handleDelete}
                          onToggle={handleToggle}
                          loading={loading}
                        />
                      );

                      if (!isUnisex) {
                        return (
                          <div className="border-t border-gray-100 divide-y divide-gray-100">
                            {svcs.map(renderCard)}
                          </div>
                        );
                      }

                      // For unisex: strict gender split using UNISEX_CATEGORIES name lookup as fallback
                      const uniCatDef     = UNISEX_CATEGORIES.find(u => u.label === cat);
                      const uniMaleNames  = uniCatDef ? new Set(uniCatDef.maleSubServices)   : new Set();
                      const uniFemaleNames = uniCatDef ? new Set(uniCatDef.femaleSubServices) : new Set();

                      const classifySvc = (s) => {
                        const af = s.applicableFor || [];
                        if (af.length > 0 && af.includes('male')   && !af.includes('female')) return 'male';
                        if (af.length > 0 && af.includes('female') && !af.includes('male'))   return 'female';
                        const inMale   = uniMaleNames.has(s.name);
                        const inFemale = uniFemaleNames.has(s.name);
                        if (inMale && !inFemale)   return 'male';
                        if (inFemale && !inMale)   return 'female';
                        return 'both';
                      };

                      const menSvcs   = svcs.filter(s => classifySvc(s) === 'male');
                      const womenSvcs = svcs.filter(s => classifySvc(s) === 'female');
                      const bothSvcs  = svcs.filter(s => classifySvc(s) === 'both');

                      return (
                        <div className="border-t border-gray-100">
                          {bothSvcs.length > 0 && (
                            <div className="divide-y divide-gray-100">{bothSvcs.map(renderCard)}</div>
                          )}
                          {menSvcs.length > 0 && (
                            <div className={bothSvcs.length > 0 ? 'border-t border-gray-100' : ''}>
                              <p className="text-xs font-semibold text-blue-600 px-4 py-2 bg-blue-50 border-b border-blue-100">👨 Men</p>
                              <div className="divide-y divide-gray-100">{menSvcs.map(renderCard)}</div>
                            </div>
                          )}
                          {womenSvcs.length > 0 && (
                            <div className={menSvcs.length > 0 || bothSvcs.length > 0 ? 'border-t border-gray-100' : ''}>
                              <p className="text-xs font-semibold text-pink-600 px-4 py-2 bg-pink-50 border-b border-pink-100">👩 Women</p>
                              <div className="divide-y divide-gray-100">{womenSvcs.map(renderCard)}</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Stats */}
        {!loading && services?.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              📊 You have <strong>{services.length}</strong> service{services.length !== 1 ? 's' : ''} in your salon
            </p>
          </div>
        )}

        {/* Service Modal */}
        <ServiceModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          service={selectedService}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          salon={salon}
        />
      </div>

      {/* Edit Categories Drawer */}
      <EditCategoriesDrawer
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        onOpen={fetchSalon}
        salon={salon}
        updateSalon={updateSalon}
      />
    </DashboardLayout>
  );
};

export default Services;