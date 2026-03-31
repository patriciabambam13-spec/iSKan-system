import { useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

import toast, { Toaster } from "react-hot-toast";

import {
    FaArrowLeft,
    FaSave,
    FaTrash,
    FaFileAlt,
    FaTimes
} from "react-icons/fa";

import "../styles/CreateProgram.css";

export default function CreateProgram() {

    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [programID, setProgramID] = useState("");

    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        program_name: "",
        program_type: "",
        program_status: "",
        description: "",
        start_date: "",
        end_date: "",
        min_age: "",
        max_age: "",
        gender: "",
        residency: "",
        require_id: false,
        require_school_id: false,
        allocated_budget: "",
        cost_per_beneficiary: "",
        estimated_beneficiaries: ""
    });

    // program id
    function generateProgramID() {
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `PRG-${random}`;
    }

    function handleChange(e) {

        const { name, value, type, checked } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    }

    // budget allocation format
    function formatNumber(value) {
        return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function handleBudgetChange(e) {

        let value = e.target.value.replace(/,/g, "");

        if (!/^\d*$/.test(value)) return;

        const formatted = formatNumber(value);

        setForm(prev => {

            const cost = Number(prev.cost_per_beneficiary || 0);

            const estimated =
                cost > 0
                    ? Math.floor(value / cost)
                    : "";

            return {
                ...prev,
                allocated_budget: formatted,
                estimated_beneficiaries: estimated
            };
        });
    }

    // computation
    function handleCostChange(e) {

        let cost = e.target.value;

        setForm(prev => {

            const budget = Number(prev.allocated_budget.replace(/,/g, "") || 0);

            const estimated =
                cost > 0
                    ? Math.floor(budget / cost)
                    : "";

            return {
                ...prev,
                cost_per_beneficiary: cost,
                estimated_beneficiaries: estimated
            };
        });
    }

    // Form Validation
    function validate() {

        let newErrors = {};

        if (!form.program_name)
            newErrors.program_name = "Program Name required";

        if (!form.program_type)
            newErrors.program_type = "Program Type required";

        if (!form.start_date)
            newErrors.start_date = "Start Date required";

        if (!form.allocated_budget)
            newErrors.allocated_budget = "Budget required";

        if (!form.cost_per_beneficiary)
            newErrors.cost_per_beneficiary = "Cost per beneficiary required";

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {

            toast.error("Please complete required fields");
            return false;

        }

        return true;
    }

    // Saving Program
    async function saveProgram(type) {

        if (type === "active" && !validate()) return;

        const id = generateProgramID();
        setProgramID(id);

        const programData = {

            program_id: id,

            program_name: form.program_name,
            program_type: form.program_type,

            program_status:
                type === "draft"
                    ? "Draft"
                    : form.program_status,

            description: form.description,

            start_date: form.start_date || null,
            end_date: form.end_date || null,

            allocated_budget:
                Number(form.allocated_budget.replace(/,/g, "")),

            cost_per_beneficiary:
                Number(form.cost_per_beneficiary),

            estimated_beneficiaries:
                Number(form.estimated_beneficiaries),

            min_age: form.min_age || null,
            max_age: form.max_age || null,

            gender: form.gender || null,
            residency: form.residency || null,

            require_id: form.require_id,
            require_school_id: form.require_school_id
        };

        const { error } = await supabase
            .from("programs")
            .insert(programData)
            .select()
            .single();

        if (error) {

            console.error(error);
            toast.error(error.message);
            return;

        }

        if (type === "draft") {

            toast.success("Draft saved successfully");
            return;

        }

        setShowModal(true);
    }

    return (

        <>
            <Navbar />
            <Toaster position="top-center" />

            {/* Main Container - matches manage youth and register youth */}
            <div className="create-program-container">
                
                {/* Header - matches exactly */}
                <div className="page-header">
                    <button className="back-btn" aria-label="Go back" onClick={() => navigate(-1)}>←</button>
                    <div className="header-text">
                        <h2>Create Program</h2>
                        <p>Set up a new SK program with rules and eligibility.</p>
                    </div>
                </div>

                {/* Forms */}
                <form
                    className="register-form"
                    onSubmit={(e) => e.preventDefault()}
                >

                    {/* section 1 - Basic Program Information */}
                    <div className="section-card">
                        <div className="section-title">
                            <span className="section-number">1</span>
                            <h3>Basic Program Information</h3>
                        </div>

                        <div className="form-group">
                            <label>Program Name <span className="req">*</span></label>
                            <input
                                name="program_name"
                                value={form.program_name}
                                onChange={handleChange}
                                placeholder="Enter program name"
                            />
                            {errors.program_name &&
                                <p className="error">{errors.program_name}</p>
                            }
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Program Type <span className="req">*</span></label>
                                <select name="program_type" onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option>Seminar</option>
                                    <option>Training</option>
                                    <option>Sports</option>
                                    <option>Financial Aid</option>
                                </select>
                                {errors.program_type &&
                                    <p className="error">{errors.program_type}</p>
                                }
                            </div>

                            <div className="form-group">
                                <label>Program Status</label>
                                <select name="program_status" onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option>Upcoming</option>
                                    <option>Active</option>
                                    <option>Completed</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                onChange={handleChange}
                                placeholder="Describe the program details..."
                                rows="4"
                            />
                        </div>
                    </div>

                    {/* section 2 - Date and Schedule */}
                    <div className="section-card">
                        <div className="section-title">
                            <span className="section-number">2</span>
                            <h3>Date and Schedule</h3>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Start Date <span className="req">*</span></label>
                                <input
                                    type="date"
                                    name="start_date"
                                    onChange={handleChange}
                                />
                                {errors.start_date &&
                                    <p className="error">{errors.start_date}</p>
                                }
                            </div>

                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    name="end_date"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* section 3 - Eligibility Requirements */}
                    <div className="section-card">
                        <div className="section-title">
                            <span className="section-number">3</span>
                            <h3>Eligibility Requirements</h3>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Minimum Age</label>
                                <input
                                    type="number"
                                    name="min_age"
                                    value={form.min_age}
                                    onChange={handleChange}
                                    placeholder="e.g., 15"
                                />
                            </div>

                            <div className="form-group">
                                <label>Maximum Age</label>
                                <input
                                    type="number"
                                    name="max_age"
                                    value={form.max_age}
                                    onChange={handleChange}
                                    placeholder="e.g., 30"
                                />
                            </div>

                            <div className="form-group">
                                <label>Gender Restriction</label>
                                <select name="gender" onChange={handleChange}>
                                    <option value="">All Genders</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Residency Requirement</label>
                                <select name="residency" onChange={handleChange}>
                                    <option value="">No Restriction</option>
                                    <option>Barangay Pinagkaisahan</option>
                                    <option>Within City</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* section 4 - Required Documents */}
                    <div className="section-card">
                        <div className="section-title">
                            <span className="section-number">4</span>
                            <h3>Required Documents</h3>
                        </div>

                        <div className="confirm-row">
                            <input
                                type="checkbox"
                                name="require_id"
                                checked={form.require_id}
                                onChange={handleChange}
                            />
                            <label>Require ID Verification</label>
                        </div>

                        <div className="confirm-row">
                            <input
                                type="checkbox"
                                name="require_school_id"
                                checked={form.require_school_id}
                                onChange={handleChange}
                            />
                            <label>Require School ID</label>
                        </div>
                    </div>

                    {/* section 5 - Budget Allocation */}
                    <div className="section-card">
                        <div className="section-title">
                            <span className="section-number">5</span>
                            <h3>Budget Allocation</h3>
                        </div>

                        <div className="grid-3">
                            <div className="form-group">
                                <label>Allocated Budget <span className="req">*</span></label>
                                <input
                                    value={form.allocated_budget}
                                    onChange={handleBudgetChange}
                                    placeholder="₱ 0.00"
                                />
                                {errors.allocated_budget &&
                                    <p className="error">{errors.allocated_budget}</p>
                                }
                            </div>

                            <div className="form-group">
                                <label>Cost per Beneficiary (₱) <span className="req">*</span></label>
                                <input
                                    value={form.cost_per_beneficiary}
                                    onChange={handleCostChange}
                                    placeholder="₱ 0.00"
                                />
                                {errors.cost_per_beneficiary &&
                                    <p className="error">{errors.cost_per_beneficiary}</p>
                                }
                            </div>

                            <div className="form-group">
                                <label>Estimated Beneficiaries</label>
                                <input
                                    className="disabled-field"
                                    value={form.estimated_beneficiaries}
                                    disabled
                                    placeholder="Auto-calculated"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="form-buttons">
                        <button type="button" className="cancel-btn" onClick={() => navigate("/dashboard")}>
                            <FaTimes /> Cancel
                        </button>

                        <button type="button" className="clear-btn" onClick={() => window.location.reload()}>
                            <FaTrash /> Clear Form
                        </button>

                        <button type="button" className="btn-secondary" onClick={() => saveProgram("draft")}>
                            <FaFileAlt /> Save Draft
                        </button>

                        <button type="button" className="save-btn" onClick={() => saveProgram("active")}>
                            <FaSave /> Save Program
                        </button>
                    </div>

                </form>

                {/* MODAL */}
                {showModal && (
                    <div className="overlay">
                        <div className="qr-modal">
                            <h2 className="qr-title">Program Successfully Created</h2>
                            <p className="qr-sub">The program has been registered in the system.</p>

                            <div className="qr-frame">
                                <p>Program ID</p>
                                <h3 className="qr-id">{programID}</h3>
                                <p>Program Name</p>
                                <h4>{form.program_name}</h4>
                            </div>

                            <div className="qr-buttons">
                                <button className="btn-print" onClick={() => navigate("/programs")}>
                                    View Programs
                                </button>
                                <button className="btn-register" onClick={() => window.location.reload()}>
                                    Create Another
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}