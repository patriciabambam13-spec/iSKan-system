import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { format } from "date-fns";
import { FaFileCsv, FaChartBar, FaChartPie, FaFilter, FaUsers, FaCheckCircle, FaCalendarCheck, FaChartLine, FaPrint, FaFilePdf } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/generateReports.css";

const CHART_COLORS = ["#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6"];

export default function GenerateReports() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [program, setProgram] = useState("");
  const [reportType, setReportType] = useState("summary");
  const [isLoading, setIsLoading] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [filteredYouths, setFilteredYouths] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    programs: 0,
    participation: 0,
    male: 0,
    female: 0,
    other: 0
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [programData, setProgramData] = useState([]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*");

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("youth").select("*");

      if (fromDate && toDate) {
        query = query.gte("created_at", fromDate).lte("created_at", toDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const youthData = data || [];
      
      let filtered = youthData;
      if (program) {
        filtered = youthData.filter(y => y.program_id === program);
      }
      setFilteredYouths(filtered);

      const total = filtered.length;
      const active = filtered.filter(y => y.status === "Active" || !y.status).length;
      const male = filtered.filter(y => y.gender === "Male").length;
      const female = filtered.filter(y => y.gender === "Female").length;
      const other = filtered.filter(y => y.gender === "Other" || (y.gender !== "Male" && y.gender !== "Female")).length;

      setStats({
        total,
        active,
        programs: programs.length,
        participation: total ? Math.round((active / total) * 100) : 0,
        male,
        female,
        other
      });

      const months = {};
      filtered.forEach(y => {
        const month = format(new Date(y.created_at || Date.now()), "MMM");
        months[month] = (months[month] || 0) + 1;
      });

      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyArray = monthOrder
        .filter(m => months[m])
        .map(m => ({
          name: m,
          value: months[m]
        }));

      setMonthlyData(monthlyArray);

      const genderArray = [
        { name: "Male", value: male },
        { name: "Female", value: female },
        { name: "Other", value: other }
      ].filter(g => g.value > 0);

      setGenderData(genderArray);

      const programStats = {};
      filtered.forEach(y => {
        if (y.program_id) {
          programStats[y.program_id] = (programStats[y.program_id] || 0) + 1;
        }
      });

      const programArray = Object.keys(programStats).map(pid => ({
        name: programs.find(p => p.id === pid)?.program_name || "Unknown",
        value: programStats[pid]
      }));

      setProgramData(programArray);

    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, program]);

  const exportCSV = () => {
    if (filteredYouths.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Name", "Gender", "Age", "Contact", "Email", "Status", "Registration Date"];
    const rows = filteredYouths.map(y => [
      `${y.first_name || ''} ${y.last_name || ''}`.trim(),
      y.gender || "",
      y.age || "",
      y.contact || "",
      y.email || "",
      y.status || "Active",
      y.created_at ? format(new Date(y.created_at), "yyyy-MM-dd") : ""
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell || ''}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `youth_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setProgram("");
    setReportType("summary");
  };

  const handlePrint = () => {
    if (filteredYouths.length === 0) {
      alert("No data to print");
      return;
    }
    window.print();
  };

  const getImageDataUrl = (imagePath) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        console.log(`Image not found: ${imagePath}`);
        resolve(null);
      };
      
      img.src = `${imagePath}?t=${new Date().getTime()}`;
    });
  };

  const exportPDF = async () => {
    if (filteredYouths.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      const doc = new jsPDF();
      let currentY = 20;

      const qcLogo = await getImageDataUrl("/qc-logo.png");
      const skLogo = await getImageDataUrl("/sk-logo.png");
      const skLogo2 = await getImageDataUrl("/sk-logoo.png");

      if (qcLogo) {
        doc.addImage(qcLogo, "PNG", 15, currentY - 5, 25, 25);
      }
      if (skLogo) {
        doc.addImage(skLogo, "PNG", 85, currentY - 5, 25, 25);
      }
      if (skLogo2) {
        doc.addImage(skLogo2, "PNG", 155, currentY - 5, 25, 25);
      }
      
      currentY += 25;

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Republic of the Philippines", 105, currentY, { align: "center" });
      currentY += 5;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.text("Sangguniang Kabataan", 105, currentY, { align: "center" });
      currentY += 7;
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Youth Participation Report", 105, currentY, { align: "center" });
      currentY += 8;
      doc.setFont(undefined, "normal");

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Date Generated: ${format(new Date(), "MMMM dd, yyyy")}`, 105, currentY, { align: "center" });
      currentY += 5;
      doc.text(`Time: ${format(new Date(), "hh:mm:ss a")}`, 105, currentY, { align: "center" });
      currentY += 12;

      if (fromDate || toDate || program) {
        doc.setFillColor(255, 248, 225);
        doc.rect(14, currentY - 3, 182, 12, "F");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "bold");
        doc.text("Applied Filters:", 14, currentY);
        doc.setFont(undefined, "normal");
        doc.setTextColor(80, 80, 80);
        let filterX = 60;
        if (fromDate) {
          doc.text(`From: ${fromDate}`, filterX, currentY);
          filterX += 35;
        }
        if (toDate) {
          doc.text(`To: ${toDate}`, filterX, currentY);
          filterX += 35;
        }
        if (program) {
          const programName = programs.find(p => p.id === program)?.program_name || program;
          doc.text(`Program: ${programName}`, filterX, currentY);
        }
        currentY += 10;
      }

      doc.setDrawColor(242, 183, 5);
      doc.setLineWidth(0.5);
      doc.line(14, currentY, 196, currentY);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.text("EXECUTIVE SUMMARY", 14, currentY + 5);
      currentY += 12;
      
      doc.setFillColor(255, 248, 225);
      doc.rect(14, currentY - 2, 182, 28, "F");
      
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Total Youth:", 20, currentY + 5);
      doc.setFont(undefined, "normal");
      doc.setFontSize(14);
      doc.setTextColor(242, 183, 5);
      doc.text(stats.total.toString(), 20, currentY + 12);
      
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Active Youth:", 75, currentY + 5);
      doc.setFont(undefined, "normal");
      doc.setFontSize(14);
      doc.setTextColor(242, 183, 5);
      doc.text(stats.active.toString(), 75, currentY + 12);
      
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Total Programs:", 130, currentY + 5);
      doc.setFont(undefined, "normal");
      doc.setFontSize(14);
      doc.setTextColor(242, 183, 5);
      doc.text(stats.programs.toString(), 130, currentY + 12);
      
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Participation Rate:", 20, currentY + 20);
      doc.setFont(undefined, "normal");
      doc.setFontSize(14);
      doc.setTextColor(242, 183, 5);
      doc.text(`${stats.participation}%`, 20, currentY + 27);
      
      currentY += 38;

      if (genderData.length > 0) {
        doc.setDrawColor(242, 183, 5);
        doc.line(14, currentY, 196, currentY);
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("GENDER DISTRIBUTION", 14, currentY + 5);
        currentY += 10;
        
        const genderTableData = genderData.map(g => [
          g.name,
          g.value,
          `${Math.round((g.value / stats.total) * 100)}%`
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [["Gender", "Count", "Percentage"]],
          body: genderTableData,
          theme: "striped",
          headStyles: { fillColor: [242, 183, 5], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
          bodyStyles: { fontSize: 9, halign: "center" },
          alternateRowStyles: { fillColor: [255, 248, 225] },
          margin: { left: 14, right: 14 }
        });
        
        currentY = doc.lastAutoTable.finalY + 8;
      }

      if (monthlyData.length > 0) {
        doc.setDrawColor(242, 183, 5);
        doc.line(14, currentY, 196, currentY);
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("MONTHLY PARTICIPATION TRENDS", 14, currentY + 5);
        currentY += 10;
        
        const monthlyTableData = monthlyData.map(m => [m.name, m.value]);
        
        autoTable(doc, {
          startY: currentY,
          head: [["Month", "Number of Participants"]],
          body: monthlyTableData,
          theme: "striped",
          headStyles: { fillColor: [242, 183, 5], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
          bodyStyles: { fontSize: 9, halign: "center" },
          alternateRowStyles: { fillColor: [255, 248, 225] },
          margin: { left: 14, right: 14 }
        });
        
        currentY = doc.lastAutoTable.finalY + 8;
      }

      if (programData.length > 0) {
        doc.setDrawColor(242, 183, 5);
        doc.line(14, currentY, 196, currentY);
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("PROGRAM PARTICIPATION", 14, currentY + 5);
        currentY += 10;
        
        const programTableData = programData.map(p => [p.name, p.value]);
        
        autoTable(doc, {
          startY: currentY,
          head: [["Program Name", "Number of Participants"]],
          body: programTableData,
          theme: "striped",
          headStyles: { fillColor: [242, 183, 5], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
          bodyStyles: { fontSize: 8, halign: "center" },
          alternateRowStyles: { fillColor: [255, 248, 225] },
          margin: { left: 14, right: 14 }
        });
        
        currentY = doc.lastAutoTable.finalY + 8;
      }

      doc.setDrawColor(242, 183, 5);
      doc.line(14, currentY, 196, currentY);
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("YOUTH DIRECTORY", 14, currentY + 5);
      currentY += 10;

      const tableData = filteredYouths.map(y => [
        `${y.first_name || ""} ${y.last_name || ""}`.trim() || "-",
        y.gender || "-",
        y.age || "-",
        y.contact || "-",
        y.status || "Active"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Name", "Gender", "Age", "Contact", "Status"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [242, 183, 5], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
        styles: { fontSize: 8, cellPadding: 3, halign: "center" },
        alternateRowStyles: { fillColor: [255, 248, 225] },
        margin: { left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setDrawColor(242, 183, 5);
      doc.line(14, finalY - 5, 196, finalY - 5);
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.text("Prepared by:", 14, finalY);
      doc.setFont(undefined, "normal");
      doc.text("_________________________", 14, finalY + 3);
      doc.text("SK Secretary", 14, finalY + 7);
      
      doc.setFont(undefined, "bold");
      doc.text("Noted by:", 105, finalY);
      doc.setFont(undefined, "normal");
      doc.text("_________________________", 105, finalY + 3);
      doc.text("SK Chairperson", 105, finalY + 7);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Barangay Youth Development Office", 105, finalY + 15, { align: "center" });
      doc.text(`Generated on: ${format(new Date(), "yyyy-MM-dd hh:mm:ss a")}`, 105, finalY + 20, { align: "center" });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: "center" });
      }

      doc.save(`youth_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="reports-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-text">
            <h2>Generate Reports</h2>
            <p>View and export youth participation analytics</p>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-header">
            <FaFilter className="filter-icon" />
            <span>Filter Criteria</span>
          </div>
          
          <div className="filters-wrapper">
            <div className="filter-item">
              <label>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-item">
              <label>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-item">
              <label>Program</label>
              <select 
                onChange={e => setProgram(e.target.value)} 
                value={program}
                className="filter-select"
              >
                <option value="">All Programs</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.program_name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Report Type</label>
              <select 
                onChange={e => setReportType(e.target.value)}
                value={reportType}
                className="filter-select"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
              </select>
            </div>

            <div className="filter-item filter-buttons">
              <label>&nbsp;</label>
              <div className="button-group">
                <button onClick={clearFilters} className="btn-outline">
                  Clear Filters
                </button>
                <button onClick={exportCSV} className="btn-primary">
                  <FaFileCsv /> Export CSV
                </button>
                <button onClick={exportPDF} className="btn-pdf">
                  <FaFilePdf /> Download PDF
                </button>
                <button onClick={handlePrint} className="btn-secondary">
                  <FaPrint /> Print Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading reports...</p>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-info">
                  <h3>{stats.total}</h3>
                  <p>Total Youth</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaCheckCircle />
                </div>
                <div className="stat-info">
                  <h3>{stats.active}</h3>
                  <p>Active Youth</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaCalendarCheck />
                </div>
                <div className="stat-info">
                  <h3>{stats.programs}</h3>
                  <p>Total Programs</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartLine />
                </div>
                <div className="stat-info">
                  <h3>{stats.participation}%</h3>
                  <p>Participation Rate</p>
                </div>
              </div>
            </div>

            <div className="charts-container">
              <div className="chart-card">
                <div className="chart-header">
                  <FaChartBar className="chart-icon" />
                  <h4>Monthly Participation Trends</h4>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F2B705" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <FaChartPie className="chart-icon" />
                  <h4>Gender Distribution</h4>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {programData.length > 0 && (
              <div className="chart-card full-width">
                <div className="chart-header">
                  <FaChartBar className="chart-icon" />
                  <h4>Program Participation Overview</h4>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={programData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" stroke="#888" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} width={150} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F2B705" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {reportType === "detailed" && filteredYouths.length > 0 && (
              <div className="detailed-report">
                <div className="detailed-header">
                  <h4>Youth Directory</h4>
                  <span className="record-count">{filteredYouths.length} records found</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Gender</th>
                        <th>Age</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Registration Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredYouths.map((youth, index) => (
                        <tr key={index}>
                          <td>{`${youth.first_name || ''} ${youth.last_name || ''}`.trim()}</td>
                          <td>{youth.gender || "-"}</td>
                          <td>{youth.age || "-"}</td>
                          <td>{youth.contact || "-"}</td>
                          <td>{youth.email || "-"}</td>
                          <td>
                            <span className={`status-badge ${(youth.status || "Active").toLowerCase()}`}>
                              {youth.status || "Active"}
                            </span>
                          </td>
                          <td>{youth.created_at ? format(new Date(youth.created_at), "yyyy-MM-dd") : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === "detailed" && filteredYouths.length === 0 && (
              <div className="empty-state">
                <p>No youth records found for the selected filters.</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="print-area">
        <div className="print-header">
          <div className="print-logos">
            <img src="/qc-logo.png" alt="QC Logo" className="print-logo" />
            <img src="/sk-logo.png" alt="SK Logo" className="print-logo" />
            <img src="/sk-logoo.png" alt="SK Logo 2" className="print-logo" />
          </div>
          <div className="print-title">
            <h2>Republic of the Philippines</h2>
            <h3>Sangguniang Kabataan</h3>
            <h4>Youth Participation Report</h4>
          </div>
          <div className="print-date">
            <p>Date Generated: {format(new Date(), "MMMM dd, yyyy")}</p>
            <p>Time: {format(new Date(), "hh:mm:ss a")}</p>
          </div>
        </div>
        
        <div className="print-stats">
          <div className="print-stat-item">
            <strong>Total Youth:</strong> {stats.total}
          </div>
          <div className="print-stat-item">
            <strong>Active Youth:</strong> {stats.active}
          </div>
          <div className="print-stat-item">
            <strong>Total Programs:</strong> {stats.programs}
          </div>
          <div className="print-stat-item">
            <strong>Participation Rate:</strong> {stats.participation}%
          </div>
        </div>

        {(fromDate || toDate || program) && (
          <div className="print-filters">
            <h4>Applied Filters</h4>
            <ul>
              {fromDate && <li>From Date: {fromDate}</li>}
              {toDate && <li>To Date: {toDate}</li>}
              {program && <li>Program: {programs.find(p => p.id === program)?.program_name || program}</li>}
            </ul>
          </div>
        )}

        <div className="print-section">
          <h4>Executive Summary</h4>
          <div className="print-summary-stats">
            <div>Total Youth: <strong>{stats.total}</strong></div>
            <div>Active Youth: <strong>{stats.active}</strong></div>
            <div>Total Programs: <strong>{stats.programs}</strong></div>
            <div>Participation Rate: <strong>{stats.participation}%</strong></div>
          </div>
        </div>

        {genderData.length > 0 && (
          <div className="print-section">
            <h4>Gender Distribution</h4>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Gender</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {genderData.map((g, i) => (
                  <tr key={i}>
                    <td>{g.name}</td>
                    <td>{g.value}</td>
                    <td>{Math.round((g.value / stats.total) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {monthlyData.length > 0 && (
          <div className="print-section">
            <h4>Monthly Participation Trends</h4>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Number of Participants</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td>{m.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {programData.length > 0 && (
          <div className="print-section">
            <h4>Program Participation Overview</h4>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Program Name</th>
                  <th>Number of Participants</th>
                </tr>
              </thead>
              <tbody>
                {programData.map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td>{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="print-section">
          <h4>Youth Directory</h4>
          <table className="print-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredYouths.map((y, i) => (
                <tr key={i}>
                  <td>{`${y.first_name || ''} ${y.last_name || ''}`.trim()}</td>
                  <td>{y.gender || "-"}</td>
                  <td>{y.age || "-"}</td>
                  <td>{y.contact || "-"}</td>
                  <td>{y.status || "Active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-footer">
          <div className="print-signatures">
            <div className="signature-line">
              <p>_________________________</p>
              <p><strong>SK Secretary</strong></p>
            </div>
            <div className="signature-line">
              <p>_________________________</p>
              <p><strong>SK Chairperson</strong></p>
            </div>
          </div>
          <div className="print-footer-text">
            <p>Barangay Youth Development Office</p>
            <p>Generated on: {format(new Date(), "yyyy-MM-dd hh:mm:ss a")}</p>
          </div>
        </div>
      </div>
    </>
  );
}