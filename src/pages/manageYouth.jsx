import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import "../styles/manageYouth.css";

// Added extra icons to match your design (UserPlus, FileCsv, FilePdf, TimesCircle)
import { FaSearch, FaEye, FaEdit, FaUserPlus, FaFileCsv, FaFilePdf, FaTimesCircle } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

export default function ManageYouth() {
  const [youths, setYouths] = useState([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedYouth, setSelectedYouth] = useState(null);

  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // FETCH YOUTH
  const fetchYouth = async () => {
    let query = supabase.from("youth").select("*");

    if (genderFilter) query = query.eq("gender", genderFilter);
    if (statusFilter) query = query.eq("status", statusFilter);
    if (search) query = query.or(`full_name.ilike.%${search}%,youth_id.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Failed to load youth");
      return;
    }

    setYouths(data || []);
  };

  // LOAD DATA
  useEffect(() => {
    fetchYouth();
  }, [search, genderFilter, statusFilter]);

  // DELETE
  const deleteYouth = async () => {
    const { error } = await supabase
      .from("youth")
      .delete()
      .eq("id", selectedYouth.id);

    if (error) {
      toast.error("Delete failed");
      return;
    }

    toast.success("Youth deleted");
    setShowDelete(false);
    fetchYouth();
  };

  // UPDATE
  const updateYouth = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("youth")
      .update({
        full_name: selectedYouth.full_name,
        gender: selectedYouth.gender,
        status: selectedYouth.status,
      })
      .eq("id", selectedYouth.id);

    if (error) {
      toast.error("Update failed");
      return;
    }

    toast.success("Youth updated");
    setShowEdit(false);
    fetchYouth();
  };

  return (
    <>
      <Navbar />
      <Toaster position="top-center" />

      {/* SEPARATED PAGE HEADER */}
      <div className="page-header-wrapper">
        <div className="page-header">
          <div className="page-header-left">
            <button className="back-btn" aria-label="Go back">←</button>
            <div className="header-text">
              <h2>Manage Youth</h2>
              <p>View, edit, and manage registered youth records</p>
            </div>
          </div>

          <button className="register-btn">
            <FaUserPlus className="btn-icon" /> Register New Youth
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="manage-youth-page">
        {/* FILTER CARD */}
        <div className="filter-card">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              placeholder="Search by name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">All Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select className="placeholder-select" disabled>
            <option></option>
          </select>
        </div>

        {/* RECORD BAR */}
        <div className="record-bar">
          <div className="record-text">
            Showing {youths.length < 10 ? `0${youths.length}` : youths.length} of 200 records
          </div>

          <div className="export-buttons">
            <button className="export-btn">
              <FaFileCsv className="export-icon"/> CSV
            </button>
            <button className="export-btn">
              <FaFilePdf className="export-icon"/> PDF
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-container">
          <table className="youth-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Youth ID</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Date Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {youths.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    No youth records found
                  </td>
                </tr>
              ) : (
                youths.map((youth) => (
                  <tr key={youth.id}>
                    <td className="font-medium">{youth.full_name}</td>
                    <td>{youth.youth_id}</td>
                    <td>{youth.age}</td>
                    <td>{youth.gender}</td>
                    <td>{youth.status}</td>
                    <td>{youth.date_registered}</td>
                    <td className="actions">
                      <FaEye
                        className="action-icon view"
                        onClick={() => {
                          setSelectedYouth(youth);
                          setShowView(true);
                        }}
                      />
                      <FaEdit
                        className="action-icon edit"
                        onClick={() => {
                          setSelectedYouth(youth);
                          setShowEdit(true);
                        }}
                      />
                      <FaTimesCircle
                        className="action-icon delete"
                        onClick={() => {
                          setSelectedYouth(youth);
                          setShowDelete(true);
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="pagination">
          <button className="page-btn disabled">Previous</button>
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn outline">Next</button>
        </div>

        {/* VIEW MODAL */}
        {showView && selectedYouth && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Youth Details</h3>
              <p><b>Name:</b> {selectedYouth.full_name}</p>
              <p><b>Youth ID:</b> {selectedYouth.youth_id}</p>
              <p><b>Age:</b> {selectedYouth.age}</p>
              <p><b>Gender:</b> {selectedYouth.gender}</p>
              <p><b>Status:</b> {selectedYouth.status}</p>
              <button className="modal-close-btn" onClick={() => setShowView(false)}>Close</button>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEdit && selectedYouth && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Edit Youth</h3>
              <form onSubmit={updateYouth} className="modal-form">
                <input
                  value={selectedYouth.full_name}
                  onChange={(e) =>
                    setSelectedYouth({ ...selectedYouth, full_name: e.target.value })
                  }
                  required
                />
                <select
                  value={selectedYouth.gender}
                  onChange={(e) =>
                    setSelectedYouth({ ...selectedYouth, gender: e.target.value })
                  }
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <select
                  value={selectedYouth.status}
                  onChange={(e) =>
                    setSelectedYouth({ ...selectedYouth, status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div className="modal-actions">
                  <button type="submit" className="save-btn">Update</button>
                  <button type="button" className="cancel-btn" onClick={() => setShowEdit(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {showDelete && selectedYouth && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Delete Youth</h3>
              <p>Are you sure you want to delete <b>{selectedYouth.full_name}</b>?</p>
              <div className="modal-actions">
                <button className="delete-confirm-btn" onClick={deleteYouth}>Delete</button>
                <button className="cancel-btn" onClick={() => setShowDelete(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}