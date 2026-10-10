import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './ExamDeptExaminations.css'



export default function ExamDeptExaminations() {
  const [exams, setExams] = useState([])
  const [subjects, setSubjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState(() => localStorage.getItem('examdept_selected_dept_id') || 'ALL')

  useEffect(() => {
    if (selectedDeptId) {
      localStorage.setItem('examdept_selected_dept_id', selectedDeptId)
    }
  }, [selectedDeptId])
  const [showCreate, setShowCreate] = useState(false)
  const [editingExamId, setEditingExamId] = useState(null)
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('Main Examination')
  const [totalMarks, setTotalMarks] = useState(100)
  const [examDate, setExamDate] = useState('2026-07-20')
  const [startTime, setStartTime] = useState('09:30 AM')
  const [endTime, setEndTime] = useState('12:30 PM')
  const [duration, setDuration] = useState('3 Hours')
  const [semester, setSemester] = useState('3rd Sem')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [sessionName, setSessionName] = useState('Semester End Examinations: July - August 2026')
  const [selectedCentreId, setSelectedCentreId] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [scheduleStatus, setScheduleStatus] = useState('DRAFT')
  const [msg, setMsg] = useState('')

  // Manual Exam Centre & Room State
  const [showCreateCentre, setShowCreateCentre] = useState(false)
  const [centreName, setCentreName] = useState('')
  const [centreCode, setCentreCode] = useState('')
  const [centreAddress, setCentreAddress] = useState('')
  const [centreCapacity, setCentreCapacity] = useState(300)
  const [centreMsg, setCentreMsg] = useState('')

  const [showAddRoom, setShowAddRoom] = useState(false)
  const [selectedCentreForRoom, setSelectedCentreForRoom] = useState(null)
  const [roomBuilding, setRoomBuilding] = useState('Block A')
  const [roomFloor, setRoomFloor] = useState('1st Floor')
  const [roomNumber, setRoomNumber] = useState('')
  const [roomCapacity, setRoomCapacity] = useState(40)
  const [roomMsg, setRoomMsg] = useState('')

  // Room Allocation State
  const [showAllocateModal, setShowAllocateModal] = useState(false)
  const [allocExamId, setAllocExamId] = useState('')
  const [allocCentreId, setAllocCentreId] = useState('')
  const [allocRoomId, setAllocRoomId] = useState('')
  const [allocMsg, setAllocMsg] = useState('')
  const [allocating, setAllocating] = useState(false)

  // AI Question Paper Generator Modal
  const [showAiPaperModal, setShowAiPaperModal] = useState(false)
  const [selectedExamForPaper, setSelectedExamForPaper] = useState(null)
  const [paperData, setPaperData] = useState(null)
  const [notesFile, setNotesFile] = useState(null)
  const [focusPrompt, setFocusPrompt] = useState('')
  const [generatingPaper, setGeneratingPaper] = useState(false)
  const [paperMsg, setPaperMsg] = useState('')

  // Department-Wise Hall Ticket Roster State
  const [deptStudentRoster, setDeptStudentRoster] = useState([])
  const [publishedHallTickets, setPublishedHallTickets] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [showTicketPreviewModal, setShowTicketPreviewModal] = useState(false)
  const [previewTicketData, setPreviewTicketData] = useState(null)
  const [showAllTicketsModal, setShowAllTicketsModal] = useState(false)

  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('SCHEDULE') // SCHEDULE, CENTRES, HALL_TICKETS
  const [centres, setCentres] = useState([])
  const [ticketMsg, setTicketMsg] = useState('')
  const [publishingTicket, setPublishingTicket] = useState(false)

  async function handleAllocateStudentsToRoom(e) {
    e.preventDefault()
    if (!allocExamId || !allocCentreId || !allocRoomId) {
      return setAllocMsg('Exam, Centre, and Room are required.')
    }
    setAllocating(true)
    setAllocMsg('Allocating students to selected room...')
    try {
      const { data: rosterRes } = await api.get(`/examdept/exams/${allocExamId}/students`)
      const students = rosterRes.students || []
      let successCount = 0
      for (const st of students) {
        try {
          await api.post('/examdept/allocate-room', {
            examId: allocExamId,
            studentId: st.id,
            centreId: allocCentreId,
            roomId: allocRoomId,
          })
          successCount++
        } catch (err) {
          if (err.response?.data?.error?.includes('capacity')) {
            setAllocMsg(`⚠️ Room capacity limit reached after allocating ${successCount} student(s).`)
            setAllocating(false)
            return
          }
        }
      }
      setAllocMsg(`✅ Successfully allocated ${successCount} student(s) to room! Hall tickets will show this room assignment.`)
      loadHallTicketsData()
    } catch (err) {
      setAllocMsg(`❌ Allocation error: ${err.response?.data?.error || err.message}`)
    } finally {
      setAllocating(false)
    }
  }

  function loadDepartments() {
    api.get('/examdept/departments').then((res) => setDepartments(res.data || [])).catch(() => {})
  }

  function loadCentres() {
    api.get('/examdept/exam-centres').then((res) => setCentres(res.data || [])).catch(() => {})
  }

  function loadHallTicketsData() {
    setLoadingRoster(true)
    api.get(`/examdept/departments/${selectedDeptId}/internal-marks`)
      .then((res) => setDeptStudentRoster(res.data?.students || []))
      .catch(() => setDeptStudentRoster([]))

    api.get('/examdept/hall-tickets')
      .then((res) => setPublishedHallTickets(res.data || []))
      .catch(() => setPublishedHallTickets([]))
      .finally(() => setLoadingRoster(false))
  }

  useEffect(() => {
    loadDepartments()
    load()
  }, [])

  useEffect(() => {
    if (activeTab === 'CENTRES') loadCentres()
    if (activeTab === 'HALL_TICKETS') loadHallTicketsData()
  }, [activeTab, selectedDeptId])

  function load() {
    api.get('/examdept/exams').then((res) => setExams(res.data || [])).catch(() => {})
    api.get('/examdept/subjects').then((res) => {
      setSubjects(res.data || [])
      if (res.data?.length) setSubjectId(res.data[0].id)
    }).catch(() => {})
  }

  async function handleDeleteExam(examId, examTitle) {
    if (!window.confirm(`Are you sure you want to delete "${examTitle}"?`)) return
    try {
      await api.delete(`/examdept/exams/${examId}`)
      setMsg(`✅ Deleted exam schedule "${examTitle}".`)
      load()
    } catch (err) {
      alert(`Failed to delete exam: ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleCreateCentre(e) {
    e.preventDefault()
    if (!centreName || !centreCode) return setCentreMsg('Centre Name and Code are required.')
    try {
      setCentreMsg('Creating exam centre...')
      await api.post('/examdept/exam-centres', {
        name: centreName,
        code: centreCode,
        address: centreAddress || "DSATM Campus, Kanakapura Road",
        capacity: Number(centreCapacity) || 300,
      })
      setCentreMsg('✅ Exam Centre created and added to repository!')
      setCentreName('')
      setCentreCode('')
      setCentreAddress('')
      setShowCreateCentre(false)
      loadCentres()
    } catch (err) {
      setCentreMsg(`❌ ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleAddRoom(e) {
    e.preventDefault()
    if (!selectedCentreForRoom || !roomNumber) return setRoomMsg('Room number is required.')
    try {
      setRoomMsg('Adding room to centre...')
      await api.post(`/examdept/exam-centres/${selectedCentreForRoom.id}/rooms`, {
        building: roomBuilding,
        floor: roomFloor,
        roomNumber,
        capacity: Number(roomCapacity) || 40,
      })
      setRoomMsg(`✅ Room ${roomNumber} added to ${selectedCentreForRoom.name}!`)
      setRoomNumber('')
      setShowAddRoom(false)
      loadCentres()
    } catch (err) {
      setRoomMsg(`❌ ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleDeleteCentre(centreId, centreName) {
    if (!window.confirm(`Are you sure you want to delete Exam Centre "${centreName}"?`)) return
    try {
      await api.delete(`/examdept/exam-centres/${centreId}`)
      setCentreMsg(`✅ Successfully deleted Exam Centre "${centreName}".`)
      loadCentres()
    } catch (err) {
      alert(`Failed to delete centre: ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleDeleteRoom(centreId, roomId, roomNumber) {
    if (!window.confirm(`Are you sure you want to remove Room ${roomNumber}?`)) return
    try {
      await api.delete(`/examdept/exam-centres/${centreId}/rooms/${roomId}`)
      setCentreMsg(`✅ Removed room ${roomNumber}.`)
      loadCentres()
    } catch (err) {
      alert(`Failed to delete room: ${err.response?.data?.error || err.message}`)
    }
  }

  function handleGrantCondonation(st) {
    if (!window.confirm(`Grant Exam Controller Condonation to ${st.fullName}? This overrides attendance shortage and unlocks their Hall Ticket.`)) return
    st.isAttendanceEligible = true
    st.isEligible = true
    st.attendancePercentage = Math.max(75, st.attendancePercentage || 75)
    st.isCondonedByHod = true
    st.eligibilityStatus = "ELIGIBLE (CONDONED)"
    setDeptStudentRoster([...deptStudentRoster])
    setTicketMsg(`✅ Attendance Condonation granted to ${st.fullName}! Hall ticket is now unlocked.`)
  }

  async function handlePublishIndividualHallTicket(studentObj) {
    setPublishingTicket(true)
    setTicketMsg(`🎟️ Generating & publishing admit card for ${studentObj.fullName} (${studentObj.registrationNo})...`)
    try {
      const targetExam = filteredExams[0] || exams[0] || { id: 'exam-default' }
      const enrolledBreakdown = Array.isArray(studentObj.subjectBreakdown) ? studentObj.subjectBreakdown : [];
      const timetable = enrolledBreakdown.map((sub) => {
        const match = exams.find((ex) => (ex.subjectId === sub.subjectId || ex.subject_id === sub.subjectId) && (ex.status === 'PUBLISHED' || ex.status === 'SCHEDULED')) || exams.find((ex) => ex.subjectId === sub.subjectId || ex.subject_id === sub.subjectId);
        return {
          subjectCode: sub.subjectCode || sub.code || match?.subjectCode || 'SUB',
          subjectName: sub.subjectName || sub.name || match?.subjectName || 'Registered Subject',
          examDate: match?.examDate || sub.date || '2026-07-20',
          timeSlot: match ? `${match.startTime} - ${match.endTime}` : (sub.time || '09:30 AM - 12:30 PM')
        };
      });

      const res = await api.post('/examdept/generate-hall-ticket', {
        studentId: studentObj.studentId,
        examId: targetExam.id,
        status: 'PUBLISHED',
        timetable
      })

      let notifMsg = '';
      if (res.data?.studentEmailNotification?.warning) {
        notifMsg = ` (${res.data.studentEmailNotification.warning})`;
      } else if (res.data?.studentEmailNotification?.recipient) {
        notifMsg = ` (📧 Email sent to ${res.data.studentEmailNotification.recipient})`;
      }

      setTicketMsg(`✅ Official Hall Ticket published successfully for ${studentObj.fullName} (${studentObj.registrationNo})!${notifMsg}`)
      loadHallTicketsData()
    } catch (err) {
      setTicketMsg(`❌ Failed to publish hall ticket: ${err.response?.data?.error || err.message}`)
    } finally {
      setPublishingTicket(false)
    }
  }

  async function handlePublishDepartmentHallTickets() {
    if (deptStudentRoster.length === 0) {
      return setTicketMsg('⚠️ No candidate students found for this department filter.')
    }
    setPublishingTicket(true)
    setTicketMsg(`🎟️ Batch generating & publishing hall tickets for ${deptStudentRoster.length} candidate students in department...`)
    try {
      const targetExam = filteredExams[0] || exams[0] || { id: 'exam-default' }
      let count = 0
      let emailNotifCount = 0
      for (const st of deptStudentRoster) {
        const enrolledBreakdown = Array.isArray(st.subjectBreakdown) ? st.subjectBreakdown : [];
        const timetable = enrolledBreakdown.map((sub) => {
          const match = exams.find((ex) => (ex.subjectId === sub.subjectId || ex.subject_id === sub.subjectId) && (ex.status === 'PUBLISHED' || ex.status === 'SCHEDULED')) || exams.find((ex) => ex.subjectId === sub.subjectId || ex.subject_id === sub.subjectId);
          return {
            subjectCode: sub.subjectCode || sub.code || match?.subjectCode || 'SUB',
            subjectName: sub.subjectName || sub.name || match?.subjectName || 'Registered Subject',
            examDate: match?.examDate || sub.date || '2026-07-20',
            timeSlot: match ? `${match.startTime} - ${match.endTime}` : (sub.time || '09:30 AM - 12:30 PM')
          };
        });

        const res = await api.post('/examdept/generate-hall-ticket', {
          studentId: st.studentId,
          examId: targetExam.id,
          status: 'PUBLISHED',
          timetable
        })
        count++
        if (res.data?.studentEmailNotification?.recipient) emailNotifCount++
      }
      setTicketMsg(`✅ Successfully published official hall tickets for ${count} student(s)! (📧 ${emailNotifCount} student notification emails dispatched).`)
      loadHallTicketsData()
    } catch (err) {
      setTicketMsg(`❌ Batch publish error: ${err.response?.data?.error || err.message}`)
    } finally {
      setPublishingTicket(false)
    }
  }

  function handlePreviewHallTicket(studentObj) {
    const existingTicket = publishedHallTickets.find((ht) => ht.student_id === studentObj.studentId)
    
    // Render candidate's enrolled subjects linked to published DB main exam schedules
    const enrolledBreakdown = Array.isArray(studentObj.subjectBreakdown) ? studentObj.subjectBreakdown : [];
    const subjectsList = enrolledBreakdown.map((sub) => {
      const match = exams.find((ex) => (ex.subjectId === sub.subjectId || ex.subject_id === sub.subjectId) && (ex.status === 'PUBLISHED' || ex.status === 'SCHEDULED')) || exams.find((ex) => ex.subjectId === sub.subjectId || ex.subject_id === sub.subjectId);
      return {
        code: sub.subjectCode || sub.code || match?.subjectCode || 'SUB',
        name: sub.subjectName || sub.name || match?.subjectName || 'Registered Subject',
        date: match?.examDate || sub.date || '2026-07-20',
        time: match ? `${match.startTime} - ${match.endTime}` : (sub.time || '09:30 AM - 12:30 PM')
      };
    });

    setPreviewTicketData({
      institution: "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT",
      subtitle: "(An Autonomous Institution Affiliated to Visvesvaraya Technological University, Belagavi & Approved by AICTE, New Delhi)",
      exam_session: "Semester End Examinations: July - August 2026",
      sem_category: "(PG EVEN SEMESTER)",
      student_name: studentObj.fullName,
      registration_no: studentObj.registrationNo,
      department_name: studentObj.departmentName ? studentObj.departmentName.toUpperCase() : "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS (MCA)",
      program: studentObj.departmentName?.includes("MCA") ? "MCA" : (studentObj.departmentName || "MCA"),
      semester: studentObj.semester || "3rd Sem",
      academic_year: "2025–2026",
      attendance_pct: studentObj.attendancePercentage || 85.0,
      is_eligible: studentObj.isEligible,
      centre_name: existingTicket?.centre_name || centres[0]?.name || "DSATM Main Academic Block Examination Centre",
      room_number: existingTicket?.room_number || "LH-101 (1st Floor)",
      seat_number: existingTicket?.seat_number || "SEAT-01",
      subjects: subjectsList,
      status: existingTicket?.status || "PUBLISHED",
    })
    setShowTicketPreviewModal(true)
  }

  function handleTicketSubjectDateChange(index, newDate) {
    if (!previewTicketData || !previewTicketData.subjects) return;
    const updated = [...previewTicketData.subjects];
    updated[index] = { ...updated[index], date: newDate };
    setPreviewTicketData({ ...previewTicketData, subjects: updated });

    if (previewTicketData.registration_no) {
      setDeptStudentRoster((prev) =>
        prev.map((st) => {
          if (st.registrationNo === previewTicketData.registration_no) {
            const subs = [...(st.subjectBreakdown || [])];
            if (subs[index]) {
              subs[index] = { ...subs[index], date: newDate };
            }
            return { ...st, subjectBreakdown: subs };
          }
          return st;
        })
      );
    }
  }

  function handleTicketSubjectTimeChange(index, newTime) {
    if (!previewTicketData || !previewTicketData.subjects) return;
    const updated = [...previewTicketData.subjects];
    updated[index] = { ...updated[index], time: newTime };
    setPreviewTicketData({ ...previewTicketData, subjects: updated });

    if (previewTicketData.registration_no) {
      setDeptStudentRoster((prev) =>
        prev.map((st) => {
          if (st.registrationNo === previewTicketData.registration_no) {
            const subs = [...(st.subjectBreakdown || [])];
            if (subs[index]) {
              subs[index] = { ...subs[index], time: newTime };
            }
            return { ...st, subjectBreakdown: subs };
          }
          return st;
        })
      );
    }
  }

  function handleRosterSubjectDateChange(studentIdx, subIdx, newDate) {
    setDeptStudentRoster((prev) => {
      const updated = [...prev];
      const st = { ...updated[studentIdx] };
      const subs = [...(st.subjectBreakdown || [])];
      subs[subIdx] = { ...subs[subIdx], date: newDate };
      st.subjectBreakdown = subs;
      updated[studentIdx] = st;
      return updated;
    });
  }

  function handleRosterSubjectTimeChange(studentIdx, subIdx, newTime) {
    setDeptStudentRoster((prev) => {
      const updated = [...prev];
      const st = { ...updated[studentIdx] };
      const subs = [...(st.subjectBreakdown || [])];
      subs[subIdx] = { ...subs[subIdx], time: newTime };
      st.subjectBreakdown = subs;
      updated[studentIdx] = st;
      return updated;
    });
  }

  async function handleSaveAndPublishSingleTicket() {
    if (!previewTicketData) return;
    const targetStudent = deptStudentRoster.find(s => s.registrationNo === previewTicketData.registration_no) || { studentId: previewTicketData.student_id, fullName: previewTicketData.student_name, registrationNo: previewTicketData.registration_no };
    const timetable = (previewTicketData.subjects || []).map((sub) => ({
      subjectCode: sub.code || sub.subjectCode || 'SUB',
      subjectName: sub.name || sub.subjectName || 'Registered Subject',
      examDate: sub.date || '20/07/2026',
      timeSlot: sub.time || '2:00 PM - 5:00 PM'
    }));

    setPublishingTicket(true);
    setTicketMsg(`💾 Saving edited dates & publishing hall ticket for ${previewTicketData.student_name}...`);
    try {
      const targetExam = filteredExams[0] || exams[0] || { id: 'exam-default' };
      await api.post('/examdept/generate-hall-ticket', {
        studentId: targetStudent.studentId || previewTicketData.student_id,
        examId: targetExam.id,
        status: 'PUBLISHED',
        timetable
      });
      setTicketMsg(`✅ Saved edited dates & published official hall ticket for ${previewTicketData.student_name}! Visible on Student Dashboard.`);
      loadHallTicketsData();
    } catch (err) {
      setTicketMsg(`❌ Failed to save hall ticket: ${err.response?.data?.error || err.message}`);
    } finally {
      setPublishingTicket(false);
    }
  }

  async function handleSaveAndPublishAllWithEditedDates() {
    const eligibleStudents = deptStudentRoster.filter((s) => s.isEligible);
    if (eligibleStudents.length === 0) {
      return setTicketMsg('⚠️ No eligible students found to publish.');
    }
    setPublishingTicket(true);
    setTicketMsg(`💾 Saving edited dates & publishing hall tickets for ${eligibleStudents.length} eligible students...`);
    try {
      const targetExam = filteredExams[0] || exams[0] || { id: 'exam-default' };
      let count = 0;
      for (const st of eligibleStudents) {
        const enrolledBreakdown = Array.isArray(st.subjectBreakdown) ? st.subjectBreakdown : [];
        const timetable = enrolledBreakdown.map((sub) => ({
          subjectCode: sub.subjectCode || sub.code || 'SUB',
          subjectName: sub.subjectName || sub.name || 'Registered Subject',
          examDate: sub.date || '20/07/2026',
          timeSlot: sub.time || '2:00 PM - 5:00 PM'
        }));

        await api.post('/examdept/generate-hall-ticket', {
          studentId: st.studentId,
          examId: targetExam.id,
          status: 'PUBLISHED',
          timetable
        });
        count++;
      }
      setTicketMsg(`✅ Saved edited dates & published official hall tickets for ${count} student(s)! Updated on Student Dashboard.`);
      loadHallTicketsData();
    } catch (err) {
      setTicketMsg(`❌ Save & publish error: ${err.response?.data?.error || err.message}`);
    } finally {
      setPublishingTicket(false);
    }
  }

  async function handleSaveSchedule(statusToSet = scheduleStatus) {
    if (!subjectId || !title || !examDate || !startTime || !endTime) {
      return setMsg('❌ Subject, Title, Date, Start Time, and End Time are required.')
    }
    const selSubject = subjects.find((s) => s.id === subjectId) || {}
    const selCentre = centres.find((c) => c.id === selectedCentreId) || centres[0] || {}
    const selRoom = (selCentre.rooms || []).find((r) => r.id === selectedRoomId) || (selCentre.rooms || [])[0] || {}

    const payload = {
      subjectId,
      subjectName: selSubject.name || 'Subject',
      subjectCode: selSubject.code || 'SUB',
      departmentId: selSubject.department_id || selSubject.departments?.id || selectedDeptId,
      departmentName: selSubject.departments?.name || 'Department',
      title,
      examDate,
      startTime,
      endTime,
      duration,
      semester,
      academicYear,
      sessionName,
      totalMarks: Number(totalMarks) || 100,
      centreId: selCentre.id || 'centre-main',
      centreName: selCentre.name || 'DSATM Main Academic Block Examination Centre',
      roomId: selRoom.id || 'room-lh101',
      roomName: selRoom.roomNumber ? `Hall ${selRoom.roomNumber} (${selRoom.building || 'Block A'})` : 'Hall LH-101 (1st Floor)',
      status: statusToSet,
    }

    try {
      if (editingExamId) {
        const res = await api.put(`/examdept/exams/${editingExamId}`, payload)
        let notifMsg = ''
        if (res.data?.hodNotification?.recipient) {
          notifMsg = ` (📧 Email sent to MCA HOD ${res.data.hodNotification.recipient})`
        }
        setMsg(`✅ Schedule "${title}" updated successfully (${statusToSet})!${notifMsg}`)
      } else {
        const res = await api.post('/examdept/exams', payload)
        let notifMsg = ''
        if (res.data?.hodNotification?.recipient) {
          notifMsg = ` (📧 Email sent to MCA HOD ${res.data.hodNotification.recipient})`
        }
        setMsg(`✅ Schedule "${title}" created successfully (${statusToSet})!${notifMsg}`)
      }
      setShowCreate(false)
      setEditingExamId(null)
      load()
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || err.message}`)
    }
  }

  function handleEditExamSchedule(exam) {
    setEditingExamId(exam.id)
    setSubjectId(exam.subjectId || exam.subject_id || (subjects[0]?.id || ''))
    setTitle(exam.title || 'Main Examination')
    setTotalMarks(exam.totalMarks || exam.total_marks || 100)
    setExamDate(exam.examDate || '2026-07-20')
    setStartTime(exam.startTime || '09:30 AM')
    setEndTime(exam.endTime || '12:30 PM')
    setDuration(exam.duration || '3 Hours')
    setSemester(exam.semester || '3rd Sem')
    setAcademicYear(exam.academicYear || '2025-2026')
    setSessionName(exam.sessionName || 'Semester End Examinations: July - August 2026')
    setSelectedCentreId(exam.centreId || '')
    setSelectedRoomId(exam.roomId || '')
    setScheduleStatus(exam.status || 'DRAFT')
    setShowCreate(true)
  }

  async function handlePublishExamSchedule(examId) {
    try {
      const res = await api.post(`/examdept/exams/${examId}/publish`)
      let notifMsg = ''
      if (res.data?.hodNotification?.recipient) {
        notifMsg = ` (📧 Email sent to MCA HOD ${res.data.hodNotification.recipient})`
      }
      setMsg(`✅ Official Schedule published successfully!${notifMsg}`)
      load()
    } catch (err) {
      setMsg(`❌ Publish failed: ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleCancelExamSchedule(examId) {
    if (!window.confirm('Are you sure you want to cancel this published/scheduled examination? Affected students and HOD will be notified.')) return
    try {
      await api.post(`/examdept/exams/${examId}/cancel`)
      setMsg('✅ Schedule cancelled successfully.')
      load()
    } catch (err) {
      setMsg(`❌ Cancel failed: ${err.response?.data?.error || err.message}`)
    }
  }

  function handleOpenAiPaperModal(exam) {
    setSelectedExamForPaper(exam)
    const deptName = exam.subjects?.departments?.name ? `DEPARTMENT OF ${exam.subjects.departments.name.toUpperCase()}` : 'DEPARTMENT OF COMPUTER APPLICATIONS'
    const subjName = exam.subjects?.name || 'Subject'
    const subjCode = exam.subjects?.code || 'CODE'

    setPaperData({
      institution: "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT",
      department: deptName,
      examTitle: exam.title || "MAIN EXAMINATION SERIES — 2026",
      subjectName: subjName,
      subjectCode: subjCode,
      time: "3 Hours",
      maxMarks: Number(exam.total_marks) || 100,
      modules: []
    })
    setShowAiPaperModal(true)
  }

  async function handleGenerateAiPaper() {
    if (!notesFile && !focusPrompt.trim()) {
      return setPaperMsg('⚠️ Please upload a notes PDF/document file or enter subject topics to generate questions strictly from notes.')
    }
    setGeneratingPaper(true)
    setPaperMsg(`🤖 AI Groq LLM (llama-3.3-70b) reading full uploaded notes content from "${notesFile?.name || 'Provided Topics'}"...`)

    try {
      const formData = new FormData()
      if (notesFile) formData.append('file', notesFile)
      formData.append('subjectName', paperData.subjectName)
      formData.append('subjectCode', paperData.subjectCode)
      formData.append('departmentName', paperData.department)
      formData.append('examTitle', paperData.examTitle)
      if (focusPrompt) formData.append('focusPrompt', focusPrompt)

      const { data } = await api.post('/examdept/generate-question-paper', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (data && data.modules && data.modules.length > 0) {
        setPaperData((prev) => ({
          ...prev,
          ...data,
          department: data.department || prev.department,
          subjectName: data.subjectName || prev.subjectName,
          subjectCode: data.subjectCode || prev.subjectCode,
        }))
        setPaperMsg(`✅ Official 5-Module Question Paper generated strictly from notes file "${notesFile?.name || 'Uploaded Content'}"!`)
      } else {
        throw new Error(data?.error || 'Invalid structure returned')
      }
    } catch (err) {
      console.error("Notes generation error:", err.message)
      setPaperMsg(`❌ Question Generation Failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setGeneratingPaper(false)
    }
  }

  function handleTextChange(moduleIdx, qKey, partKey, newText) {
    const updated = JSON.parse(JSON.stringify(paperData))
    updated.modules[moduleIdx][qKey][partKey].text = newText
    setPaperData(updated)
  }

  function handleMarksChange(moduleIdx, qKey, partKey, newMarks) {
    const updated = JSON.parse(JSON.stringify(paperData))
    updated.modules[moduleIdx][qKey][partKey].marks = Number(newMarks) || 0
    setPaperData(updated)
  }

  function handlePrintQuestionPaper() {
    window.print()
  }

  // Filter exams and subjects strictly by selected department
  const filteredExams = selectedDeptId === 'ALL'
    ? exams
    : exams.filter((e) => e.subjects?.department_id === selectedDeptId || e.subjects?.departments?.id === selectedDeptId)

  const filteredSubjects = selectedDeptId === 'ALL'
    ? subjects
    : subjects.filter((s) => s.department_id === selectedDeptId || s.departments?.id === selectedDeptId)

  // Calculate summary statistics
  const totalRoomsCount = centres.reduce((acc, c) => acc + (c.rooms?.length || 0), 0)
  const totalCapacitySeats = centres.reduce((acc, c) => acc + (Number(c.capacity) || 0), 0)

  const activeDeptObj = departments.find((d) => d.id === selectedDeptId)

  return (
    <div className="ede-container">
      {/* Top Header Banner — Institutional Blue Theme */}
      <div className="ede-header-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 30 }}>📋</span>
            <div>
              <h2 className="ede-title">Main Examinations & Centre Management</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className="ede-tag">DSATM Academic Examination Authority</span>
                <span className="ede-tag" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>Live System</span>
              </div>
            </div>
          </div>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
            Schedule main exams, configure exam centres & rooms, allocate seating rosters, and publish official admit cards.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Department Filter Selector */}
          <div className="ede-filter-box">
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 800 }}>🏛️ Dept Filter:</span>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="ede-filter-select"
            >
              <option value="ALL">🌐 All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <button className="ede-btn-primary" onClick={() => setShowCreate(!showCreate)}>
            + Create Main Exam
          </button>
        </div>
      </div>

      {/* Structured Metric Stat Cards — Institutional Pastel Theme */}
      <div className="ede-stats-grid">
        <div className="ede-stat-card blue">
          <div className="ede-stat-icon-bubble">📋</div>
          <div>
            <div className="ede-stat-value">{filteredExams.length}</div>
            <div className="ede-stat-label">Scheduled Main Exams</div>
          </div>
        </div>

        <div className="ede-stat-card purple">
          <div className="ede-stat-icon-bubble">🏢</div>
          <div>
            <div className="ede-stat-value">{centres.length}</div>
            <div className="ede-stat-label">Exam Centres</div>
          </div>
        </div>

        <div className="ede-stat-card green">
          <div className="ede-stat-icon-bubble">🚪</div>
          <div>
            <div className="ede-stat-value">{totalRoomsCount}</div>
            <div className="ede-stat-label">Configured Exam Halls</div>
          </div>
        </div>

        <div className="ede-stat-card orange">
          <div className="ede-stat-icon-bubble">👥</div>
          <div>
            <div className="ede-stat-value">{totalCapacitySeats}</div>
            <div className="ede-stat-label">Total Seating Capacity</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="ede-tabs-bar">
        {[
          { id: 'SCHEDULE', icon: '📅', label: `Schedule & AI Question Papers (${filteredExams.length})` },
          { id: 'CENTRES', icon: '🏢', label: `Exam Centres & Room Allocation (${centres.length})` },
          { id: 'HALL_TICKETS', icon: '🎟️', label: `Hall Tickets & Admit Cards (${deptStudentRoster.length || 0})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ede-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {ticketMsg && (
        <div style={{ padding: '14px 20px', borderRadius: 12, background: ticketMsg.includes('✅') ? '#ecfdf5' : '#eff6ff', border: `1px solid ${ticketMsg.includes('✅') ? '#a7f3d0' : '#bfdbfe'}`, color: ticketMsg.includes('✅') ? '#047857' : '#1d4ed8', fontSize: 13, fontWeight: 700 }}>
          {ticketMsg}
        </div>
      )}

      {/* CREATE / EDIT MAIN EXAMINATION PANEL */}
      {showCreate && (
        <div className="ede-form-card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: 17, color: '#1d4ed8', fontWeight: 800 }}>
            {editingExamId ? '✏️ Edit Main Examination Schedule' : '📅 Schedule New Main Examination'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Target Subject & Department</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="ede-input">
                {filteredSubjects.map((s) => <option key={s.id} value={s.id}>{s.departments?.name || 'Dept'} — {s.name} ({s.code || 'CODE'})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Main Exam Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="ede-input" placeholder="e.g. Main Examination Series" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Total Raw Marks</label>
              <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} className="ede-input" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Exam Date</label>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="ede-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Start Time</label>
              <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="ede-input" placeholder="09:30 AM" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>End Time</label>
              <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="ede-input" placeholder="12:30 PM" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Duration</label>
              <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className="ede-input" placeholder="3 Hours" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Semester</label>
              <input value={semester} onChange={(e) => setSemester(e.target.value)} className="ede-input" placeholder="3rd Sem" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Academic Year</label>
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="ede-input" placeholder="2025-2026" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Examination Session</label>
              <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="ede-input" placeholder="Semester End Examinations: July - August 2026" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Examination Centre</label>
              <select value={selectedCentreId} onChange={(e) => { setSelectedCentreId(e.target.value); setSelectedRoomId(''); }} className="ede-input">
                <option value="">Default: DSATM Main Academic Block</option>
                {centres.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Examination Hall / Room</label>
              <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="ede-input">
                <option value="">Default: Hall LH-101 (1st Floor)</option>
                {((centres.find(c => c.id === selectedCentreId)?.rooms) || []).map((r) => (
                  <option key={r.id} value={r.id}>Room {r.roomNumber} — {r.building} ({r.floor}) [Cap: {r.capacity}]</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { setShowCreate(false); setEditingExamId(null); }} style={{ padding: '9px 18px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
            <button type="button" onClick={() => handleSaveSchedule('DRAFT')} style={{ padding: '9px 18px', borderRadius: 10, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer', fontWeight: 700 }}>
              💾 Save Draft
            </button>
            <button type="button" onClick={() => handleSaveSchedule('SCHEDULED')} style={{ padding: '9px 18px', borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer', fontWeight: 700 }}>
              📅 Validate & Schedule
            </button>
            <button className="ede-btn-primary" onClick={() => handleSaveSchedule('PUBLISHED')}>
              📢 Validate & Publish Schedule
            </button>
          </div>
          {msg && <p style={{ marginTop: 12, color: msg.includes('❌') ? '#dc2626' : '#059669', fontWeight: 700, fontSize: 13 }}>{msg}</p>}
        </div>
      )}

      {/* TAB 1: SCHEDULE & AI QUESTION PAPERS */}
      {activeTab === 'SCHEDULE' && (
        <div className="ede-cards-grid">
          {filteredExams.map((e) => {
            const statusUpper = (e.status || 'SCHEDULED').toUpperCase();
            const statusBg = statusUpper === 'PUBLISHED' ? '#ecfdf5' : statusUpper === 'DRAFT' ? '#fef3c7' : statusUpper === 'CANCELLED' ? '#fef2f2' : '#eff6ff';
            const statusColor = statusUpper === 'PUBLISHED' ? '#047857' : statusUpper === 'DRAFT' ? '#b45309' : statusUpper === 'CANCELLED' ? '#dc2626' : '#1d4ed8';
            const statusBorder = statusUpper === 'PUBLISHED' ? '#a7f3d0' : statusUpper === 'DRAFT' ? '#fde68a' : statusUpper === 'CANCELLED' ? '#fecaca' : '#bfdbfe';

            return (
              <div key={e.id} className="ede-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', background: '#eff6ff', padding: '4px 10px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                      {e.departmentName || e.subjects?.departments?.name || 'Department'}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
                      {statusUpper}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, margin: '0 0 8px 0', color: '#0f172a', fontWeight: 800 }}>{e.title}</h3>
                  <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px 0', fontWeight: 600 }}>
                    Subject: <strong style={{ color: '#1d4ed8' }}>{e.subjectName || e.subjects?.name || 'Subject'}{e.subjectCode || e.subjects?.code ? ` (${e.subjectCode || e.subjects.code})` : ''}</strong>
                  </p>

                  <div style={{ fontSize: 12, color: '#334155', background: '#f8fafc', padding: '12px 14px', borderRadius: 10, marginBottom: 14, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>📅 Date: <strong>{e.examDate || '2026-07-20'}</strong> ({e.startTime || '09:30 AM'} – {e.endTime || '12:30 PM'})</div>
                    <div>⏱️ Duration: <strong>{e.duration || '3 Hours'}</strong> | Semester: <strong>{e.semester || '3rd Sem'}</strong></div>
                    <div>🏛️ Session: <strong>{e.sessionName || 'Semester End Examinations 2026'}</strong></div>
                    <div>🏢 Centre: <strong>{e.centreName || 'DSATM Main Academic Block'}</strong></div>
                    <div>🚪 Room: <strong>{e.roomName || 'Hall LH-101'}</strong></div>
                    <div>💯 Weightage: <strong>{e.totalMarks || e.total_marks || 100} Marks Raw</strong></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {statusUpper !== 'PUBLISHED' && (
                      <button
                        onClick={() => handlePublishExamSchedule(e.id)}
                        style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      >
                        📢 Publish
                      </button>
                    )}
                    {statusUpper !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancelExamSchedule(e.id)}
                        style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      >
                        🚫 Cancel
                      </button>
                    )}
                    <button
                      onClick={() => handleEditExamSchedule(e)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleOpenAiPaperModal(e)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e9d5ff', background: '#faf5ff', color: '#7e22ce', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
                    >
                      🤖 AI Paper
                    </button>
                    <button
                      onClick={() => navigate(`/examdept/evaluation?examId=${e.id}`)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
                    >
                      ⚙️ Evaluate
                    </button>
                    <button
                      onClick={() => navigate(`/examdept/results?examId=${e.id}`)}
                      className="ede-btn-emerald"
                      style={{ flex: 1, padding: '8px 10px', fontSize: 11, textAlign: 'center' }}
                    >
                      📢 Results
                    </button>
                    <button
                      onClick={() => handleDeleteExam(e.id, e.title)}
                      title="Delete Exam Schedule"
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredExams.length === 0 && (
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#64748b' }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 14 }}>📋</span>
              <strong style={{ color: '#0f172a', fontSize: 18 }}>No Main Examinations Scheduled for Selected Department</strong>
              <p style={{ margin: '8px 0 16px 0', fontSize: 14 }}>Click "+ Create Main Exam" above to schedule a new examination series.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXAM CENTRES & ROOM ALLOCATION */}
      {activeTab === 'CENTRES' && (
        <div className="glass-panel" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 19, color: '#0f172a', fontWeight: 800 }}>🏢 Main Examination Centres & Room Capacities</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
                Configured examination centres, assigned buildings, exam halls, and seating capacity safeguards.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAllocateModal(!showAllocateModal)}
                style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                📍 Allocate Student Roster to Room
              </button>
              <button
                onClick={() => setShowCreateCentre(!showCreateCentre)}
                className="ede-btn-primary"
              >
                + Create New Exam Centre
              </button>
            </div>
          </div>

          {allocMsg && (
            <div style={{ padding: '14px 20px', borderRadius: 12, marginBottom: 20, background: allocMsg.includes('✅') ? '#ecfdf5' : '#fff1f2', border: `1px solid ${allocMsg.includes('✅') ? '#a7f3d0' : '#fecdd3'}`, color: allocMsg.includes('✅') ? '#047857' : '#e11d48', fontSize: 13, fontWeight: 700 }}>
              {allocMsg}
            </div>
          )}

          {/* Allocate Students to Room Form */}
          {showAllocateModal && (
            <form onSubmit={handleAllocateStudentsToRoom} className="ede-form-card" style={{ borderColor: '#a7f3d0' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 16, color: '#047857', fontWeight: 800 }}>📍 Allocate Exam Roster to Centre & Room</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Select Scheduled Exam</label>
                  <select
                    value={allocExamId}
                    onChange={(e) => setAllocExamId(e.target.value)}
                    required
                    className="ede-input"
                  >
                    <option value="">-- Choose Exam --</option>
                    {filteredExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.title} — ({ex.subjects?.departments?.name || 'Dept'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Select Exam Centre</label>
                  <select
                    value={allocCentreId}
                    onChange={(e) => {
                      setAllocCentreId(e.target.value)
                      const chosen = centres.find((c) => c.id === e.target.value)
                      if (chosen?.rooms?.length) setAllocRoomId(chosen.rooms[0].id)
                    }}
                    required
                    className="ede-input"
                  >
                    <option value="">-- Choose Centre --</option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code}) — Cap: {c.capacity}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Select Exam Room / Hall</label>
                  <select
                    value={allocRoomId}
                    onChange={(e) => setAllocRoomId(e.target.value)}
                    required
                    className="ede-input"
                  >
                    <option value="">-- Choose Room --</option>
                    {(centres.find((c) => c.id === allocCentreId)?.rooms || []).map((r) => (
                      <option key={r.id} value={r.id}>{r.building} · {r.room_number} ({r.floor}) — Max {r.capacity} Seats</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAllocateModal(false)} style={{ padding: '9px 18px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={allocating} className="ede-btn-emerald">
                  {allocating ? '⏳ Allocating Roster...' : '📍 Assign Room to Student Roster'}
                </button>
              </div>
            </form>
          )}

          {centreMsg && (
            <div style={{ padding: '14px 20px', borderRadius: 12, marginBottom: 20, background: centreMsg.includes('✅') ? '#ecfdf5' : '#fff1f2', border: `1px solid ${centreMsg.includes('✅') ? '#a7f3d0' : '#fecdd3'}`, color: centreMsg.includes('✅') ? '#047857' : '#e11d48', fontSize: 13, fontWeight: 700 }}>
              {centreMsg}
            </div>
          )}

          {/* Create Exam Centre Form */}
          {showCreateCentre && (
            <form onSubmit={handleCreateCentre} className="ede-form-card">
              <h4 style={{ margin: '0 0 14px 0', fontSize: 16, color: '#1d4ed8', fontWeight: 800 }}>➕ Add New Examination Centre</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Centre Name</label>
                  <input
                    type="text"
                    placeholder="e.g. DSATM Block C Examination Centre"
                    value={centreName}
                    onChange={(e) => setCentreName(e.target.value)}
                    required
                    className="ede-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Centre Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CENTRE-102"
                    value={centreCode}
                    onChange={(e) => setCentreCode(e.target.value)}
                    required
                    className="ede-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Campus Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Kanakapura Road, Udayapura, Bengaluru"
                    value={centreAddress}
                    onChange={(e) => setCentreAddress(e.target.value)}
                    className="ede-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Seating Capacity</label>
                  <input
                    type="number"
                    value={centreCapacity}
                    onChange={(e) => setCentreCapacity(e.target.value)}
                    required
                    className="ede-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateCentre(false)} style={{ padding: '9px 18px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button type="submit" className="ede-btn-emerald">Save Centre</button>
              </div>
            </form>
          )}

          {/* Add Room Form */}
          {showAddRoom && selectedCentreForRoom && (
            <form onSubmit={handleAddRoom} className="ede-form-card" style={{ borderColor: '#e9d5ff' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 16, color: '#7e22ce', fontWeight: 800 }}>➕ Add Room to {selectedCentreForRoom.name}</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Building</label>
                  <input
                    type="text"
                    placeholder="e.g. Block B"
                    value={roomBuilding}
                    onChange={(e) => setRoomBuilding(e.target.value)}
                    required
                    className="ede-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Floor</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor"
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    required
                    className="ede-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Room Number / Hall</label>
                  <input
                    type="text"
                    placeholder="e.g. LH-203"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    required
                    className="ede-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 700 }}>Room Capacity</label>
                  <input
                    type="number"
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(e.target.value)}
                    required
                    className="ede-input"
                  />
                </div>
              </div>

              {roomMsg && <div style={{ fontSize: 13, color: roomMsg.includes('✅') ? '#047857' : '#e11d48', fontWeight: 800, marginBottom: 12 }}>{roomMsg}</div>}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddRoom(false)} style={{ padding: '9px 18px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button type="submit" className="ede-btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>Save Room</button>
              </div>
            </form>
          )}

          {/* Exam Centres Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 24 }}>
            {centres.map((c) => (
              <div key={c.id} className="glass-panel" style={{ padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', fontWeight: 800, textTransform: 'uppercase' }}>{c.code}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedCentreForRoom(c)
                          setShowAddRoom(true)
                        }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e9d5ff', background: '#faf5ff', color: '#7e22ce', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        + Add Room
                      </button>
                      <button
                        onClick={() => handleDeleteCentre(c.id, c.name)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecdd3', background: '#fff1f2', color: '#e11d48', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                        title="Delete Exam Centre"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#0f172a', fontWeight: 800 }}>{c.name}</h4>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0', fontWeight: 600 }}>📍 {c.address}</p>
                  
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#334155', border: '1px solid #e2e8f0' }}>
                    <span>Total Seating Capacity:</span>
                    <strong style={{ color: '#047857', fontSize: 15, fontWeight: 900 }}>{c.capacity} Seats</strong>
                  </div>

                  <div className="ede-table-wrap">
                    <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: 12, letterSpacing: '0.5px' }}>Configured Exam Halls ({c.rooms?.length || 0}):</div>
                    
                    {c.rooms?.length > 0 ? (
                      <table className="ede-table">
                        <thead>
                          <tr>
                            <th>Building / Room</th>
                            <th>Floor</th>
                            <th>Capacity</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(c.rooms || []).map((r) => (
                            <tr key={r.id || r.room_number}>
                              <td style={{ fontWeight: 700 }}>
                                {r.building} · <span style={{ color: '#1d4ed8', fontWeight: 800 }}>{r.room_number}</span>
                              </td>
                              <td style={{ color: '#64748b' }}>{r.floor}</td>
                              <td style={{ color: '#047857', fontWeight: 800 }}>{r.capacity} Seats</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => handleDeleteRoom(c.id, r.id, r.room_number)}
                                  style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: 14 }}
                                  title="Remove Room"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>No rooms added yet. Click "+ Add Room" above to add halls.</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENT-WISE HALL TICKETS & ADMIT CARDS */}
      {activeTab === 'HALL_TICKETS' && (
        <div className="glass-panel" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 20, color: '#0f172a', fontWeight: 800 }}>🎟️ Department-Wise Hall Tickets & Admit Cards</h3>
                <span className="ede-tag">
                  {selectedDeptId === 'ALL' ? 'All Departments' : activeDeptObj?.name || 'Department'}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0 0' }}>
                Review registered exam subjects, HOD internal eligibility (≥ 25/50), and seating allocations to manually generate & publish admit cards per department.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                disabled={publishingTicket || loadingRoster || deptStudentRoster.length === 0}
                onClick={() => setShowAllTicketsModal(true)}
                className="ede-btn-emerald"
                style={{ padding: '12px 20px', fontSize: 13, fontWeight: 800 }}
                title="View scrollable list of all student hall tickets and print batch PDF"
              >
                📜 View & Print All Hall Tickets (Scrollable)
              </button>
              <button
                disabled={publishingTicket || loadingRoster}
                onClick={handlePublishDepartmentHallTickets}
                className="ede-btn-primary"
                style={{ padding: '12px 22px', fontSize: 13, fontWeight: 800 }}
              >
                {publishingTicket ? '⏳ Publishing Admit Cards...' : `🎟️ Publish All Hall Tickets for ${selectedDeptId === 'ALL' ? 'All Depts' : activeDeptObj?.name || 'Dept'}`}
              </button>
            </div>
          </div>

          {loadingRoster ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              ⏳ Loading department student roster, subject courses, and hall ticket status...
            </div>
          ) : deptStudentRoster.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', background: '#f8fafc', borderRadius: 14, border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>🎟️</span>
              <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Student Roster Found for Selected Department Filter</h4>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Select a specific department in the top toolbar to view student subjects and generate hall tickets.</p>
            </div>
          ) : (
            <div className="ede-table-wrap">
              <table className="ede-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>USN / Reg No</th>
                    <th>Student Name</th>
                    <th>Department & Sem</th>
                    <th>Attendance % (HOD)</th>
                    <th>HOD Internals</th>
                    <th>Eligibility Status</th>
                    <th>Seating Allocation</th>
                    <th>Admit Card Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deptStudentRoster.map((st, idx) => {
                    const existingTicket = publishedHallTickets.find((ht) => ht.student_id === st.studentId)
                    const isPublished = !!existingTicket || existingTicket?.status === 'PUBLISHED'

                    return (
                      <tr key={st.studentId || idx}>
                        <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 900, color: '#1d4ed8' }}>{st.registrationNo}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{st.fullName}</td>
                        <td style={{ fontSize: 12, color: '#475569' }}>
                          <strong>{st.departmentName || 'MCA'}</strong>
                          <div style={{ color: '#64748b', fontSize: 11 }}>{st.semester}</div>
                        </td>
                        <td>
                          {st.hasAnyAttendance ? (
                            <>
                              <div style={{ fontWeight: 900, color: (st.attendancePercentage >= 75 || st.isCondonedByHod) ? '#047857' : '#dc2626', fontSize: 13 }}>
                                {st.attendancePercentage}%
                              </div>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: (st.attendancePercentage >= 75 || st.isCondonedByHod) ? '#ecfdf5' : '#fef2f2', color: (st.attendancePercentage >= 75 || st.isCondonedByHod) ? '#047857' : '#dc2626', fontWeight: 800, border: `1px solid ${(st.attendancePercentage >= 75 || st.isCondonedByHod) ? '#a7f3d0' : '#fecaca'}` }}>
                                {(st.attendancePercentage >= 75 || st.isCondonedByHod) ? '✅ ATTENDANCE OK' : '❌ LOW ATTENDANCE (<75%)'}
                              </span>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 800, color: '#d97706', fontSize: 12 }}>
                                Pending Entry
                              </div>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fffbeb', color: '#b45309', fontWeight: 800, border: '1px solid #fcd34d' }}>
                                ⚠️ FACULTY PENDING
                              </span>
                            </>
                          )}
                        </td>
                        <td>
                          {st.subjectBreakdown && st.subjectBreakdown.some((sb) => sb.hasEnteredMarks) ? (
                            <>
                              <div style={{ fontWeight: 900, color: st.avgInternal50 >= 25 ? '#047857' : '#e11d48', fontSize: 13 }}>
                                {st.avgInternal50} / 50 Marks
                              </div>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: st.avgInternal50 >= 25 ? '#ecfdf5' : '#fff1f2', color: st.avgInternal50 >= 25 ? '#047857' : '#e11d48', fontWeight: 800, border: `1px solid ${st.avgInternal50 >= 25 ? '#a7f3d0' : '#fecdd3'}` }}>
                                {st.avgInternal50 >= 25 ? '✅ INTERNALS OK' : '❌ MARKS LOW (<25)'}
                              </span>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 800, color: '#d97706', fontSize: 12 }}>
                                Pending Entry
                              </div>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fffbeb', color: '#b45309', fontWeight: 800, border: '1px solid #fcd34d' }}>
                                ⚠️ FACULTY PENDING
                              </span>
                            </>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontWeight: 800,
                            background: st.isEligible ? '#ecfdf5' : '#fff1f2',
                            color: st.isEligible ? '#047857' : '#dc2626',
                            border: `1px solid ${st.isEligible ? '#a7f3d0' : '#fecdd3'}`,
                            display: 'inline-block'
                          }}>
                            {st.isEligible ? '✅ ELIGIBLE' : `❌ ${st.eligibilityStatus || 'DETAINED'}`}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {existingTicket ? (
                            <div>
                              <strong style={{ color: '#0f172a' }}>📍 {existingTicket.centre_name || 'Main Centre'}</strong>
                              <div style={{ color: '#047857', fontWeight: 800, fontSize: 11 }}>
                                {existingTicket.room_number || 'LH-101'} ({existingTicket.seat_number || 'SEAT-01'})
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Auto-assigned on publish</span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 800,
                            background: isPublished ? '#ecfdf5' : '#fff7ed',
                            color: isPublished ? '#047857' : '#c2410c',
                            border: `1px solid ${isPublished ? '#a7f3d0' : '#fed7aa'}`,
                          }}>
                            {isPublished ? '🎟️ PUBLISHED' : '⏳ NOT GENERATED'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {!st.isEligible && (
                              <button
                                onClick={() => handleGrantCondonation(st)}
                                style={{ padding: '6px 10px', fontSize: 11, borderRadius: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontWeight: 800, cursor: 'pointer' }}
                                title="Grant Controller Attendance Condonation & Unlock Admit Card"
                              >
                                🏥 Condonation
                              </button>
                            )}
                            <button
                              disabled={publishingTicket || !st.isEligible}
                              title={st.isEligible ? 'Publish Admit Card' : 'Blocked: Student is DETAINED due to low attendance (<75%) or low internals (<25)'}
                              onClick={() => handlePublishIndividualHallTicket(st)}
                              className="ede-btn-primary"
                              style={{ padding: '6px 12px', fontSize: 12, opacity: st.isEligible ? 1 : 0.5, cursor: st.isEligible ? 'pointer' : 'not-allowed' }}
                            >
                              🎟️ {isPublished ? 'Republish' : 'Generate'}
                            </button>
                            <button
                              onClick={() => handlePreviewHallTicket(st)}
                              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 800, cursor: 'pointer' }}
                            >
                              👁️ View
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OFFICIAL ADMIT CARD / HALL TICKET PREVIEW MODAL — EXACT PHYSICAL PAPER FORMAT */}
      {showTicketPreviewModal && previewTicketData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 900, maxHeight: '94vh', overflowY: 'auto', margin: 0, padding: 32, border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 18, margin: 0, color: '#0f172a', fontWeight: 800 }}>🎟️ Official Admission Ticket Preview (VTU / DSATM Standard)</h3>
              <button onClick={() => setShowTicketPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Printable VTU Official Admission Ticket Sheet */}
            <div className="printable-ticket-sheet" style={{ background: '#ffffff', color: '#000000', padding: '36px 40px', borderRadius: 4, fontFamily: 'Times New Roman, Georgia, serif', border: '2px solid #000000', marginBottom: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              
              {/* Top Header with Dual Emblem Logos (DSATM Left + VTU Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', gap: 12, alignItems: 'center', borderBottom: '2px solid #000000', paddingBottom: 14, marginBottom: 18 }}>
                <div style={{ textAlign: 'center' }}>
                  <img src="/dsi-logo.png" alt="DSATM Logo" style={{ width: 72, height: 72, objectFit: 'contain' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', fontFamily: 'serif', lineHeight: '1.25', color: '#000000' }}>
                    DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT
                  </div>
                  <div style={{ fontSize: 11, fontStyle: 'normal', fontWeight: 'bold', color: '#1e293b', marginTop: 4, lineHeight: '1.3' }}>
                    (An Autonomous Institution Affiliated to Visvesvaraya Technological University, Belagavi & Approved by AICTE, New Delhi)
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#000000', textDecoration: 'underline' }}>
                    OFFICIAL ADMISSION TICKET / HALL TICKET
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: '#000000' }}>
                    Semester End Main Examinations: July - August 2026
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: '#1e3a8a' }}>
                    {previewTicketData.sem_category || "(PG EVEN SEMESTER)"}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <img src="/vtu-logo.png" alt="VTU Emblem" style={{ width: 70, height: 70, objectFit: 'contain' }} />
                </div>
              </div>

              {/* Student Metadata Box & Photo Frame */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 16, marginBottom: 16, border: '1px solid #000000', padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'serif' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: 170, padding: '3px 0' }}>CANDIDATE NAME</td>
                      <td style={{ fontWeight: 'bold' }}>: {previewTicketData.student_name}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '3px 0' }}>USN / REG NO</td>
                      <td style={{ fontWeight: 'bold', fontSize: 13, color: '#1e3a8a' }}>: {previewTicketData.registration_no}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '3px 0' }}>DEPARTMENT</td>
                      <td style={{ fontWeight: 'bold' }}>: {previewTicketData.department_name}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '3px 0' }}>DEGREE / PROGRAM</td>
                      <td style={{ fontWeight: 'bold' }}>: {previewTicketData.program || 'MCA'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '3px 0' }}>SEMESTER</td>
                      <td style={{ fontWeight: 'bold' }}>: {previewTicketData.semester || '3rd Sem'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '3px 0' }}>EXAMINATION CENTRE</td>
                      <td style={{ fontWeight: 'bold', color: '#047857' }}>: {previewTicketData.centre_name} ({previewTicketData.room_number})</td>
                    </tr>
                  </tbody>
                </table>

                {/* Candidate Photo Frame */}
                <div style={{ border: '1px solid #000000', height: 135, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: 6, textAlign: 'center' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 4 }}>
                    👤
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 'bold', color: '#0f172a', lineHeight: '1.2' }}>
                    CANDIDATE PHOTO<br/>
                    <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#475569' }}>{previewTicketData.registration_no}</span>
                  </span>
                  {/* Barcode Representation */}
                  <div style={{ marginTop: 4, letterSpacing: '2px', fontSize: 8, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '1px 4px' }}>
                    |||| || ||| ||||
                  </div>
                </div>
              </div>

              {/* Course Roster Table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  📋 REGISTERED COURSES FOR MAIN EXAMINATION
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: 11, fontFamily: 'serif' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000000' }}>
                      <th style={{ borderRight: '1px solid #000000', padding: '8px 6px', textAlign: 'center', width: '15%', fontWeight: 'bold' }}>COURSE CODE</th>
                      <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', textAlign: 'left', width: '37%', fontWeight: 'bold' }}>COURSE TITLE</th>
                      <th style={{ borderRight: '1px solid #000000', padding: '8px 6px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>DATE</th>
                      <th style={{ borderRight: '1px solid #000000', padding: '8px 6px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>TIME SLOT</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', width: '12%', fontWeight: 'bold' }}>INVIGILATOR SIGNATURE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTicketData.subjects && previewTicketData.subjects.length > 0 ? (
                      previewTicketData.subjects.map((sub, sIdx) => (
                        <tr key={sIdx} style={{ borderBottom: '1px solid #000000' }}>
                          <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{sub.code}</td>
                          <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', textTransform: 'uppercase', fontWeight: '600' }}>{sub.name}</td>
                          <td style={{ borderRight: '1px solid #000000', padding: '4px 4px', textAlign: 'center' }}>
                            <input
                              type="text"
                              className="ticket-date-input"
                              value={sub.date || '20/07/2026'}
                              onChange={(e) => handleTicketSubjectDateChange(sIdx, e.target.value)}
                              style={{
                                width: '100%',
                                textAlign: 'center',
                                border: 'none',
                                background: 'transparent',
                                padding: '2px 0',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                fontWeight: 'bold',
                                color: '#000000',
                                outline: 'none',
                                boxShadow: 'none'
                              }}
                              title="Click to edit exam date manually"
                            />
                          </td>
                          <td style={{ borderRight: '1px solid #000000', padding: '4px 4px', textAlign: 'center' }}>
                            <input
                              type="text"
                              className="ticket-time-input"
                              value={sub.time || '2:00 PM - 5:00 PM'}
                              onChange={(e) => handleTicketSubjectTimeChange(sIdx, e.target.value)}
                              style={{
                                width: '100%',
                                textAlign: 'center',
                                border: 'none',
                                background: 'transparent',
                                padding: '2px 0',
                                fontSize: '10px',
                                fontFamily: 'inherit',
                                fontWeight: '600',
                                color: '#000000',
                                outline: 'none',
                                boxShadow: 'none'
                              }}
                              title="Click to edit time slot manually"
                            />
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>No registered courses found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Controller Seal Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 16, marginTop: 36, alignItems: 'flex-end', fontFamily: 'serif', fontSize: 11 }}>
                {/* Left: Student Signature (MANUAL ON EXAM DAY) */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: 32 }}></div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: 4, fontWeight: 'bold' }}>
                    SIGNATURE OF CANDIDATE
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>
                    (To be signed manually on Exam Day)
                  </div>
                </div>

                {/* Center: COE Signature */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'cursive', fontSize: 14, color: '#1e3a8a', marginBottom: 2, fontStyle: 'italic', fontWeight: 'bold' }}>
                    Nagaraj. C
                  </div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 11 }}>SIGNATURE OF COE</div>
                    <div style={{ fontWeight: '600', fontSize: 10, color: '#334155', marginTop: 2 }}>Controller of Examinations</div>
                  </div>
                </div>

                {/* Right: Principal Signature */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'cursive', fontSize: 14, color: '#0f172a', marginBottom: 2, fontStyle: 'italic', fontWeight: 'bold' }}>
                    R.S.S
                  </div>
                  <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 11 }}>SIGNATURE OF PRINCIPAL</div>
                    <div style={{ fontWeight: '600', fontSize: 10, color: '#334155', marginTop: 2 }}>Principal</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Official Admission Ticket for <strong>{previewTicketData.student_name} ({previewTicketData.registration_no})</strong>.
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  disabled={publishingTicket}
                  onClick={handleSaveAndPublishSingleTicket}
                  className="ede-btn-primary"
                  style={{ padding: '10px 18px', fontSize: 13 }}
                >
                  {publishingTicket ? '⏳ Saving...' : '💾 Save Changes & Publish'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="ede-btn-emerald"
                  style={{ padding: '10px 18px', fontSize: 13 }}
                >
                  📥 Print Official Admission Ticket PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL BATCH HALL TICKETS PREVIEW MODAL — SCROLLABLE ALL TICKETS */}
      {showAllTicketsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 960, maxHeight: '94vh', overflowY: 'auto', margin: 'auto', padding: 32, border: '1px solid #bfdbfe' }}>
            
            {/* Header Bar */}
            <div style={{ position: 'sticky', top: -32, background: '#ffffff', zIndex: 10, margin: '-32px -32px 24px -32px', padding: '16px 32px', borderBottom: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div>
                <h3 style={{ fontSize: 18, margin: 0, color: '#0f172a', fontWeight: 800 }}>📜 Batch Official Hall Tickets ({deptStudentRoster.filter(s => s.isEligible).length} Eligible Candidates)</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Scroll down to view/edit all hall tickets. Click Save or Print to generate full A4 PDF document.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  disabled={publishingTicket}
                  onClick={handleSaveAndPublishAllWithEditedDates}
                  className="ede-btn-primary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  {publishingTicket ? '⏳ Saving...' : '💾 Save All Changes & Publish'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="ede-btn-emerald"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  📥 Print / Download All Hall Tickets (PDF)
                </button>
                <button onClick={() => setShowAllTicketsModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 24, cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            {/* Roster of Hall Tickets Stacked Vertically */}
            {deptStudentRoster.filter(s => s.isEligible).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                No eligible candidates found for hall ticket generation.
              </div>
            ) : (
              deptStudentRoster.filter(s => s.isEligible).map((st, stIdx) => {
                const existingTicket = publishedHallTickets.find((ht) => ht.student_id === st.studentId);
                const enrolledSubs = Array.isArray(st.subjectBreakdown) ? st.subjectBreakdown : [];

                return (
                  <div key={st.studentId || stIdx} className="printable-ticket-sheet" style={{ background: '#ffffff', color: '#000000', padding: '36px 40px', borderRadius: 4, fontFamily: 'Times New Roman, Georgia, serif', border: '2px solid #000000', marginBottom: 32, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', gap: 12, alignItems: 'center', borderBottom: '2px solid #000000', paddingBottom: 14, marginBottom: 18 }}>
                      <div style={{ textAlign: 'center' }}>
                        <img src="/dsi-logo.png" alt="DSATM Logo" style={{ width: 72, height: 72, objectFit: 'contain' }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', fontFamily: 'serif', lineHeight: '1.25', color: '#000000' }}>
                          DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT
                        </div>
                        <div style={{ fontSize: 11, fontStyle: 'normal', fontWeight: 'bold', color: '#1e293b', marginTop: 4, lineHeight: '1.3' }}>
                          (An Autonomous Institution Affiliated to Visvesvaraya Technological University, Belagavi & Approved by AICTE, New Delhi)
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 900, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#000000', textDecoration: 'underline' }}>
                          OFFICIAL ADMISSION TICKET / HALL TICKET
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: '#000000' }}>
                          Semester End Main Examinations: July - August 2026
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: '#1e3a8a' }}>
                          (PG EVEN SEMESTER)
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <img src="/vtu-logo.png" alt="VTU Emblem" style={{ width: 70, height: 70, objectFit: 'contain' }} />
                      </div>
                    </div>

                    {/* Student Metadata */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 16, marginBottom: 16, border: '1px solid #000000', padding: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'serif' }}>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 'bold', width: 170, padding: '3px 0' }}>CANDIDATE NAME</td>
                            <td style={{ fontWeight: 'bold' }}>: {st.fullName}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', padding: '3px 0' }}>USN / REG NO</td>
                            <td style={{ fontWeight: 'bold', fontSize: 13, color: '#1e3a8a' }}>: {st.registrationNo}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', padding: '3px 0' }}>DEPARTMENT</td>
                            <td style={{ fontWeight: 'bold' }}>: {st.departmentName ? st.departmentName.toUpperCase() : "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS (MCA)"}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', padding: '3px 0' }}>DEGREE / PROGRAM</td>
                            <td style={{ fontWeight: 'bold' }}>: {st.departmentName?.includes("MCA") ? "MCA" : (st.departmentName || "MCA")}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', padding: '3px 0' }}>SEMESTER</td>
                            <td style={{ fontWeight: 'bold' }}>: {st.semester || '3rd Sem'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', padding: '3px 0' }}>EXAMINATION CENTRE</td>
                            <td style={{ fontWeight: 'bold', color: '#047857' }}>: {existingTicket?.centre_name || centres[0]?.name || "DSATM Main Academic Block Examination Centre"} ({existingTicket?.room_number || "LH-101"})</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Candidate Photo */}
                      <div style={{ border: '1px solid #000000', height: 135, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: 6, textAlign: 'center' }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 4 }}>
                          👤
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 'bold', color: '#0f172a', lineHeight: '1.2' }}>
                          CANDIDATE PHOTO<br/>
                          <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#475569' }}>{st.registrationNo}</span>
                        </span>
                        <div style={{ marginTop: 4, letterSpacing: '2px', fontSize: 8, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '1px 4px' }}>
                          |||| || ||| ||||
                        </div>
                      </div>
                    </div>

                    {/* Course Roster Table */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        📋 REGISTERED COURSES FOR MAIN EXAMINATION
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: 11, fontFamily: 'serif' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000000' }}>
                            <th style={{ borderRight: '1px solid #000000', padding: '8px 6px', textAlign: 'center', width: '15%', fontWeight: 'bold' }}>COURSE CODE</th>
                            <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', textAlign: 'left', width: '37%', fontWeight: 'bold' }}>COURSE TITLE</th>
                            <th style={{ borderRight: '1px solid #000000', padding: '8px 6px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>DATE</th>
                            <th style={{ borderRight: '1px solid #000000', padding: '8px 6px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>TIME SLOT</th>
                            <th style={{ padding: '8px 6px', textAlign: 'center', width: '12%', fontWeight: 'bold' }}>INVIGILATOR SIGNATURE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrolledSubs.length > 0 ? (
                            enrolledSubs.map((sub, sIdx) => (
                              <tr key={sIdx} style={{ borderBottom: '1px solid #000000' }}>
                                <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{sub.subjectCode || sub.code || 'SUB'}</td>
                                <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', textTransform: 'uppercase', fontWeight: '600' }}>{sub.subjectName || sub.name || 'Subject'}</td>
                                <td style={{ borderRight: '1px solid #000000', padding: '4px 4px', textAlign: 'center' }}>
                                  <input
                                    type="text"
                                    className="ticket-date-input"
                                    value={sub.date || '20/07/2026'}
                                    onChange={(e) => handleRosterSubjectDateChange(stIdx, sIdx, e.target.value)}
                                    style={{
                                      width: '100%',
                                      textAlign: 'center',
                                      border: 'none',
                                      background: 'transparent',
                                      padding: '2px 0',
                                      fontSize: '11px',
                                      fontFamily: 'inherit',
                                      fontWeight: 'bold',
                                      color: '#000000',
                                      outline: 'none',
                                      boxShadow: 'none'
                                    }}
                                    title="Click to edit exam date"
                                  />
                                </td>
                                <td style={{ borderRight: '1px solid #000000', padding: '4px 4px', textAlign: 'center' }}>
                                  <input
                                    type="text"
                                    className="ticket-time-input"
                                    value={sub.time || '2:00 PM - 5:00 PM'}
                                    onChange={(e) => handleRosterSubjectTimeChange(stIdx, sIdx, e.target.value)}
                                    style={{
                                      width: '100%',
                                      textAlign: 'center',
                                      border: 'none',
                                      background: 'transparent',
                                      padding: '2px 0',
                                      fontSize: '10px',
                                      fontFamily: 'inherit',
                                      fontWeight: '600',
                                      color: '#000000',
                                      outline: 'none',
                                      boxShadow: 'none'
                                    }}
                                    title="Click to edit time slot"
                                  />
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}></td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>No registered courses found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Signatures */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 16, marginTop: 36, alignItems: 'flex-end', fontFamily: 'serif', fontSize: 11 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ height: 32 }}></div>
                        <div style={{ borderTop: '1px solid #000000', paddingTop: 4, fontWeight: 'bold' }}>
                          SIGNATURE OF CANDIDATE
                        </div>
                        <div style={{ fontSize: 9, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>
                          (To be signed manually on Exam Day)
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'cursive', fontSize: 14, color: '#1e3a8a', marginBottom: 2, fontStyle: 'italic', fontWeight: 'bold' }}>
                          Nagaraj. C
                        </div>
                        <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>
                          <div style={{ fontWeight: 'bold', fontSize: 11 }}>SIGNATURE OF COE</div>
                          <div style={{ fontWeight: '600', fontSize: 10, color: '#334155', marginTop: 2 }}>Controller of Examinations</div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'cursive', fontSize: 14, color: '#0f172a', marginBottom: 2, fontStyle: 'italic', fontWeight: 'bold' }}>
                          R.S.S
                        </div>
                        <div style={{ borderTop: '1px solid #000000', paddingTop: 4 }}>
                          <div style={{ fontWeight: 'bold', fontSize: 11 }}>SIGNATURE OF PRINCIPAL</div>
                          <div style={{ fontWeight: '600', fontSize: 10, color: '#334155', marginTop: 2 }}>Principal</div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* AI QUESTION PAPER GENERATOR & EDITOR MODAL */}
      {showAiPaperModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 1000, maxHeight: '92vh', overflowY: 'auto', margin: 0, padding: 36, border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 22, margin: 0, color: '#0f172a', fontWeight: 800 }}>🤖 Groq AI Question Paper Generator & Editor</h3>
                <p style={{ color: '#1d4ed8', fontSize: 13, margin: '4px 0 0', fontWeight: 600 }}>
                  {paperData.department} · {paperData.subjectName} ({paperData.subjectCode})
                </p>
              </div>
              <button onClick={() => setShowAiPaperModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 26, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Source Notes Upload & Generation Controls */}
            <div style={{ background: '#f8fafc', padding: 22, borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', fontWeight: 700, marginBottom: 6 }}>📄 Upload Syllabus / Notes PDF Document:</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setNotesFile(e.target.files[0])} style={{ fontSize: 12, color: '#334155', width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#1d4ed8', fontWeight: 700, marginBottom: 6 }}>💬 Custom Focus Instructions / AI Prompt:</label>
                  <input
                    type="text"
                    placeholder="e.g., Focus heavily on Normalization, 2PL, ER Diagrams & SQL Joins"
                    value={focusPrompt}
                    onChange={(e) => setFocusPrompt(e.target.value)}
                    className="ede-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  disabled={generatingPaper}
                  onClick={handleGenerateAiPaper}
                  className="ede-btn-primary"
                >
                  {generatingPaper ? '⏳ Groq LLM Analyzing PDF & Generating...' : '⚡ Generate Groq AI Question Paper'}
                </button>
              </div>
            </div>

            {paperMsg && (
              <div style={{ padding: '14px 20px', borderRadius: 12, background: paperMsg.includes('✅') ? '#ecfdf5' : '#eff6ff', border: `1px solid ${paperMsg.includes('✅') ? '#a7f3d0' : '#bfdbfe'}`, color: paperMsg.includes('✅') ? '#047857' : '#1d4ed8', fontSize: 13, marginBottom: 24, fontWeight: 700 }}>
                {paperMsg}
              </div>
            )}

            {/* Printable & Editable VTU / DSATM Structured Question Paper Sheet */}
            <div style={{ background: '#ffffff', color: '#0f172a', padding: '44px 52px', borderRadius: 12, fontFamily: 'serif', marginBottom: 28, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1' }}>
              
              {/* Header Box */}
              <div style={{ textAlign: 'center', borderBottom: '3px double #0f172a', paddingBottom: 18, marginBottom: 22 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: '0.5px' }}>DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</div>
                <div style={{ fontSize: 13, fontStyle: 'italic', marginTop: 4, color: '#334155' }}>(An Autonomous Institution affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)</div>
                <div style={{ fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 10, color: '#1e293b' }}>{paperData.department}</div>
                <div style={{ fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, color: '#4338ca' }}>{paperData.examTitle}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 13, fontWeight: 'bold' }}>
                  <span>Subject: <span style={{ color: '#0f172a' }}>{paperData.subjectName}</span></span>
                  <span>Subject Code: <span style={{ color: '#4338ca' }}>{paperData.subjectCode}</span></span>
                  <span>Time: <span>3 Hours</span></span>
                  <span>Max Marks: <span>100 Marks</span></span>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '12px 16px', borderRadius: 8, fontSize: 12, fontWeight: 'bold', marginBottom: 26, color: '#334155', textTransform: 'uppercase' }}>
                INSTRUCTIONS:
                <ol style={{ margin: '6px 0 0 20px', padding: 0 }}>
                  <li>Answer FIVE full questions choosing ONE full question from each module.</li>
                  <li>Each full question carries 20 marks.</li>
                  <li>Use neat diagrams wherever necessary.</li>
                </ol>
              </div>

              {/* 5 MODULES RENDERER */}
              {(!paperData.modules || paperData.modules.length === 0) && (
                <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '2px dashed #cbd5e1', color: '#64748b' }}>
                  <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>📄</span>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Question Paper Generated Yet</h4>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Upload a syllabus PDF above or enter specific subject focus topics, then click <strong>"🤖 Generate 5-Module Paper"</strong> to create real question papers.
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                {paperData.modules?.map((mod, mIdx) => (
                  <div key={mIdx} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 22, background: '#fafafa' }}>
                    <div style={{ textAlign: 'center', background: '#e0e7ff', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', fontSize: 14, color: '#3730a3', textTransform: 'uppercase', marginBottom: 18 }}>
                      MODULE {mod.moduleNo}
                    </div>

                    {/* Question A */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 14, color: '#1e293b', marginBottom: 10 }}>
                        Question {mod.questionMain.qNo} (20 Marks Total)
                      </div>
                      
                      {/* Part (a) */}
                      <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(a)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionMain.partA.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionMain', 'partA', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionMain.partA.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionMain', 'partA', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Part (b) */}
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(b)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionMain.partB.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionMain', 'partB', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionMain.partB.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionMain', 'partB', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* CHOICE SEPARATOR: OR */}
                    <div style={{ textAlign: 'center', margin: '16px 0', fontWeight: '900', color: '#dc2626', fontSize: 13, letterSpacing: '2px' }}>
                      — OR —
                    </div>

                    {/* Question B */}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 14, color: '#1e293b', marginBottom: 10 }}>
                        Question {mod.questionOr.qNo} (20 Marks Total)
                      </div>
                      
                      {/* Part (a) */}
                      <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(a)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionOr.partA.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionOr', 'partA', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionOr.partA.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionOr', 'partA', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Part (b) */}
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(b)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionOr.partB.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionOr', 'partB', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionOr.partB.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionOr', 'partB', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Review and edit question text above before official print distribution.</span>
              <button
                onClick={handlePrintQuestionPaper}
                className="ede-btn-emerald"
              >
                📥 Approve & Print Question Paper PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}