import { useEffect, useState } from "react";
import API from "../services/api";

function OwnerServices() {

  const [services, setServices] = useState([]);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {

    try {

      const res = await API.get("/services/my");

      setServices(res.data.services || []);

    } catch (error) {

      console.error("Error loading services:", error);

    }

  };

  const handleAddService = async (e) => {

    e.preventDefault();

    try {

      await API.post("/services", {
        name,
        price,
        duration
      });

      setName("");
      setPrice("");
      setDuration("");

      loadServices();

    } catch (error) {

      console.error("Error adding service:", error);

      alert("Failed to add service");

    }

  };

  return (

    <div className="max-w-4xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Manage Services
      </h1>

      {/* ADD SERVICE FORM */}

      <form
        onSubmit={handleAddService}
        className="bg-white shadow-md p-4 rounded mb-6"
      >

        <h2 className="text-xl font-semibold mb-4">
          Add New Service
        </h2>

        <input
          type="text"
          placeholder="Service Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-3 w-full mb-3 rounded"
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-3 w-full mb-3 rounded"
        />

        <input
          type="number"
          placeholder="Duration (minutes)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="border p-3 w-full mb-3 rounded"
        />

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Service
        </button>

      </form>

      {/* SERVICES LIST */}

      <div>

        {services.length === 0 && (
          <p>No services added yet</p>
        )}

        {services.map((service) => (

          <div
            key={service._id}
            className="border p-4 rounded mb-3 flex justify-between items-center"
          >

            <div>

              <h3 className="font-semibold text-lg">
                {service.name}
              </h3>

              <p className="text-gray-500">
                ₹{service.price} • {service.duration} minutes
              </p>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

export default OwnerServices;