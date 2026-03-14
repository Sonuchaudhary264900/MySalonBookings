import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function CreateSalon() {

  const navigate = useNavigate();

  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [address,setAddress] = useState("");
  const [city,setCity] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      await API.post("/owner/salon",{
        name,
        phone,
        address,
        city
      });

      alert("Salon created successfully");

      navigate("/owner");

    } catch (error) {

      console.error(error);

      alert("Failed to create salon");

    }

  };

  return (

    <div className="max-w-md mx-auto p-6">

      <h1 className="text-2xl font-bold mb-6">
        Create Salon
      </h1>

      <form onSubmit={handleSubmit}>

        <input
          type="text"
          placeholder="Salon Name"
          className="border p-3 w-full mb-4 rounded"
          onChange={(e)=>setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Phone"
          className="border p-3 w-full mb-4 rounded"
          onChange={(e)=>setPhone(e.target.value)}
        />

        <input
          type="text"
          placeholder="Address"
          className="border p-3 w-full mb-4 rounded"
          onChange={(e)=>setAddress(e.target.value)}
        />

        <input
          type="text"
          placeholder="City"
          className="border p-3 w-full mb-4 rounded"
          onChange={(e)=>setCity(e.target.value)}
        />

        <button className="bg-blue-500 text-white w-full p-3 rounded hover:bg-blue-600">
          Create Salon
        </button>

      </form>

    </div>

  );

}

export default CreateSalon;