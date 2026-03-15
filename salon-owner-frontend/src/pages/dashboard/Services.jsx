import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import ServiceCard from '../../components/Services/ServiceCard';
import ServiceModal from '../../components/Services/ServiceModal';
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
  const { services, createService, updateService, deleteService, fetchServices } = useSalon();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  // Fetch services on mount
  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        await fetchServices();
      } catch (err) {
        setError('Failed to load services');
        console.error('Error fetching services:', err);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
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
    </DashboardLayout>
  );
};

export default Services;