import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import ServiceCard from '../../components/Services/ServiceCard';
import ServiceModal from '../../components/Services/ServiceModal';
import EditCategoriesDrawer from '../../components/salon/EditCategoriesDrawer';
import { useSalon } from '../../hooks/useSalon';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Fetch services and salon on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchServices(), fetchSalon()]);
      } catch (err) {
        setError('Failed to load services');
        console.error('Error fetching services:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter services by search term
  const filteredServices = (services || []).filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              <Pencil className="w-4 h-4" />
              Edit Categories
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
                <h2 className="text-lg font-semibold text-gray-900">Service Categories</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Selected during registration · Serves{' '}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {salon.offeredCategories.map((cat, idx) => (
                <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <p className="font-medium text-gray-800 text-sm mb-2">{cat.name}</p>
                  {cat.subServices?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {cat.subServices.map((sub, si) => {
                        const name  = typeof sub === 'string' ? sub : sub.name;
                        const price = typeof sub === 'string' ? null : sub.price;
                        return (
                        <span key={si} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          {name}{price > 0 && <span className="text-blue-600 font-medium">₹{price}</span>}
                        </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No sub-services selected</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div>
          <Input
            label="Search Services"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or description..."
            icon={<Search className="w-5 h-5" />}
            disabled={loading}
          />
        </div>

        {/* Services Grid */}
        {loading && !services?.length ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No services match your search' : 'No services yet'}
            </p>
            {!searchTerm && (
              <Button
                variant="primary"
                onClick={() => handleOpenModal(null)}
              >
                Create Your First Service
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(service => (
              <ServiceCard
                key={service._id || service.id}
                service={service}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
                onToggle={handleToggle}
                loading={loading}
              />
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && services?.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              📊 You have <strong>{services.length}</strong> service{services.length !== 1 ? 's' : ''} in your salon
              {searchTerm && ` (${filteredServices.length} match your search)`}
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
        />
      </div>

      {/* Edit Categories Drawer */}
      <EditCategoriesDrawer
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        salon={salon}
        updateSalon={updateSalon}
      />
    </DashboardLayout>
  );
};

export default Services;