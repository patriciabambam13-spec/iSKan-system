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

            {/* Page Header */}

            <div className="page-header">

                <button
                    className="back-btn"
                    onClick={() => navigate("/dashboard")}
                >
                    <FaArrowLeft />
                </button>

                <div>
                    <h2>Create Program</h2>
                    <p>Set up a new SK program with rules and eligibility.</p>
                </div>

            </div>

            {/* Forms */}

            <form
                className="register-form"
                onSubmit={(e) => e.preventDefault()}
            >

                {/* section 1 */}

                <div className="section-card">

                    <div className="section-title">
                        <div className="section-number">1</div>
                        <h3>Basic Program Information</h3>
                    </div>

                    <div>

                        <div className="label-row">
                            <label>Program Name</label>
                            <span className="req">*</span>
                        </div>

                        <input
                            name="program_name"
                            value={form.program_name}
                            onChange={handleChange}
                        />

                        {errors.program_name &&
                            <p className="error">{errors.program_name}</p>
                        }

                    </div>


                    <div className="grid-2">

                        <div>

                            <div className="label-row">
                                <label>Program Type</label>
                                <span className="req">*</span>
                            </div>

                            <select
                                name="program_type"
                                onChange={handleChange}
                            >
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


                        <div>

                            <div className="label-row">
                                <label>Program Status</label>
                                <span className="req">*</span>
                            </div>

                            <select
                                name="program_status"
                                onChange={handleChange}
                            >
                                <option value="">Select</option>
                                <option>Upcoming</option>
                                <option>Active</option>
                                <option>Completed</option>
                            </select>

                        </div>

                    </div>


                    <div>

                        <div className="label-row">
                            <label>Description</label>
                            <span className="req">*</span>
                        </div>

                        <textarea
                            name="description"
                            onChange={handleChange}
                        />

                    </div>

                </div>


                {/* section 2 */}

                <div className="section-card">

                    <div className="section-title">
                        <div className="section-number">2</div>
                        <h3>Date and Schedule</h3>
                    </div>

                    <div className="grid-2">

                        <div>

                            <div className="label-row">
                                <label>Start Date</label>
                                <span className="req">*</span>
                            </div>

                            <input
                                type="date"
                                name="start_date"
                                onChange={handleChange}
                            />

                            {errors.start_date &&
                                <p className="error">{errors.start_date}</p>
                            }

                        </div>


                        <div>

                            <div className="label-row">
                                <label>End Date</label>
                                <span className="req">*</span>
                            </div>

                            <input
                                type="date"
                                name="end_date"
                                onChange={handleChange}
                            />

                        </div>

                    </div>

                </div>


                {/* section 3 */}

                <div className="section-card">

                    <div className="section-title">
                        <div className="section-number">5</div>
                        <h3>Required Documents</h3>
                    </div>

                    <div className="confirm-row">

                        <input
                            type="checkbox"
                            name="require_id"
                            onChange={handleChange}
                        />

                        <label>Require ID Verification</label>

                    </div>

                    <div className="confirm-row">

                        <input
                            type="checkbox"
                            name="require_school"
                            onChange={handleChange}
                        />

                        <label>Require School ID</label>

                    </div>

                </div>


                {/* section 4 */}

                <div className="section-card">

                    <div className="section-title">
                        <div className="section-number">6</div>
                        <h3>Budget Allocation</h3>
                    </div>

                    <div className="grid-3">

                        <div>

                            <div className="label-row">
                                <label>Allocated Budget</label>
                                <span className="req">*</span>
                            </div>

                            <input
                                value={form.allocated_budget}
                                onChange={handleBudgetChange}
                                placeholder="₱ 0"
                            />

                        </div>


                        <div>

                            <div className="label-row">
                                <label>Cost per Beneficiary (₱)</label>
                                <span className="req">*</span>
                            </div>

                            <input
                                value={form.cost_per_beneficiary}
                                onChange={handleCostChange}
                                placeholder="₱ 0"
                            />

                        </div>


                        <div>

                            <div className="label-row">
                                <label>Estimated Beneficiaries</label>
                            </div>

                            <input
                                className="disabled-field"
                                value={form.estimated_beneficiaries}
                                disabled
                            />

                        </div>

                    </div>

                </div>

            </form>


   {/* buttons */}

            <div className="form-buttons">

                <button
                    className="cancel-btn"
                    onClick={() => navigate("/dashboard")}
                >
                    <FaTimes /> Cancel
                </button>

                <button
                    className="clear-btn"
                    onClick={() => window.location.reload()}
                >
                    <FaTrash /> Clear Form
                </button>

                <button
                    className="btn-print"
                    onClick={() => saveProgram("draft")}
                >
                    <FaFileAlt /> Save Draft
                </button>

                <button
                    className="save-btn"
                    onClick={() => saveProgram("active")}
                >
                    <FaSave /> Save Program
                </button>

            </div>

          {/* MODAL */}

            {showModal && (

                <div className="overlay">

                    <div className="qr-modal">

                        <h2 className="qr-title">
                            Program Successfully Created
                        </h2>

                        <p className="qr-sub">
                            The program has been registered in the system.
                        </p>

                        <div className="qr-frame">

                            <p>Program ID</p>
                            <h3 className="qr-id">{programID}</h3>

                            <p>Program Name</p>
                            <h4>{form.program_name}</h4>

                        </div>

                    </div>

                </div>

            )}

        </>
    );
}