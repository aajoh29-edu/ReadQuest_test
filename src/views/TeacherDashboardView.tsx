import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  Grid,
  ClipboardList,
  PlusCircle,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  Calendar,
  X,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Assignment,
  Classroom,
  Learner,
  Lesson,
  Mastery,
  Skill,
  TeacherProfile,
} from '../types';
import { questRepository, downloadCSV } from '../services/repository';
import { Button } from '../components/common/Button';

export const TeacherDashboardView: React.FC = () => {
  const navigate = useNavigate();

  // Teacher & Class State
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [activeClass, setActiveClass] = useState<Classroom | null>(null);

  // Matrix and Roster Data
  const [matrixData, setMatrixData] = useState<
    {
      learner: Learner;
      skillsMastery: Record<string, Mastery>;
      overallAccuracy: number;
      totalQuestsCompleted: number;
      totalActiveMinutes: number;
    }[]
  >([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<'all' | string>('all');
  const [activeTab, setActiveTab] = useState<'matrix' | 'roster' | 'assignments'>('matrix');

  // Modals
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Learner | null>(null);
  const [studentDetailMastery, setStudentDetailMastery] = useState<Mastery[]>([]);
  const [studentRecentAttempts, setStudentRecentAttempts] = useState<any[]>([]);

  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [newAssignLessonId, setNewAssignLessonId] = useState('');
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [newAssignInstructions, setNewAssignInstructions] = useState('');
  const [newAssignSelectedLearners, setNewAssignSelectedLearners] = useState<string[]>([]);
  const [newAssignClassId, setNewAssignClassId] = useState('');
  const [assignmentLearners, setAssignmentLearners] = useState<Learner[]>([]);
  const [assignmentRosterLoading, setAssignmentRosterLoading] = useState(false);
  const [assignmentRosterError, setAssignmentRosterError] = useState('');
  const [assignmentRosterRetry, setAssignmentRosterRetry] = useState(0);
  const [assignmentSaveError, setAssignmentSaveError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [assignmentSuccessMsg, setAssignmentSuccessMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [teacherProfile, teacherClasses, allSkills, allLessons] = await Promise.all([
        questRepository.getTeacherProfile(),
        questRepository.getTeacherClasses(),
        questRepository.getSkills(),
        questRepository.getAllLessons(),
      ]);

      setTeacher(teacherProfile);
      setClasses(teacherClasses);
      setSkills(allSkills);
      setLessons(allLessons);

      const targetClassId = teacherClasses[0]?.id || '';
      setSelectedClassId(targetClassId);
      const cls = teacherClasses.find((c) => c.id === targetClassId) || null;
      setActiveClass(cls);

      if (targetClassId) {
        await refreshClassData(targetClassId);
      } else {
        setMatrixData([]);
        setAssignments([]);
      }
    } catch (err) {
      console.error('Failed to load teacher portal:', err);
      setLoadError('Unable to load classroom mastery data right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClassData = async (classId: string) => {
    const [matrix, classAssignments] = await Promise.all([
      questRepository.getClassMasteryMatrix(classId),
      questRepository.getAssignments(classId),
    ]);
    setMatrixData(matrix);
    setAssignments(classAssignments);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!showCreateAssignmentModal || !newAssignClassId) return;
    let cancelled = false;
    setAssignmentRosterLoading(true);
    setAssignmentRosterError('');
    setAssignmentLearners([]);
    setNewAssignSelectedLearners([]);
    questRepository.getClassLearners(newAssignClassId).then((learners) => {
      if (cancelled) return;
      setAssignmentLearners(learners);
      setNewAssignSelectedLearners(learners.map((learner) => learner.id));
    }).catch((err) => {
      if (cancelled) return;
      console.error('Failed to load assignment roster:', err);
      setAssignmentRosterError('Unable to load students for this class. Please try again.');
    }).finally(() => {
      if (!cancelled) setAssignmentRosterLoading(false);
    });
    return () => { cancelled = true; };
  }, [showCreateAssignmentModal, newAssignClassId, assignmentRosterRetry]);

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId) || null;
    setActiveClass(cls);
    await refreshClassData(classId);
  };

  const handleExportCSV = async () => {
    if (!selectedClassId) return;
    setIsExporting(true);
    try {
      const csv = await questRepository.exportTeacherClassCSV(selectedClassId);
      const filename = `ReadQuest_${activeClass?.name.replace(/\s+/g, '_') || 'Class'}_Mastery_Matrix.csv`;
      downloadCSV(filename, csv);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenStudentDetail = async (learner: Learner) => {
    setSelectedStudentForDetail(learner);
    const [masteries, attempts] = await Promise.all([
      questRepository.getMasterySummary(learner.id),
      questRepository.getLearnerRecentAttempts(learner.id, 20),
    ]);
    setStudentDetailMastery(masteries);
    setStudentRecentAttempts(attempts);
  };

  const handleOpenAssignmentModal = () => {
    if (lessons.length > 0) {
      setNewAssignLessonId(lessons[0].id);
      setNewAssignTitle(`Practice: ${lessons[0].title}`);
      setNewAssignDueDate(
        new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
      );
      setNewAssignInstructions('Please practice this quest before Friday small group reading.');
    }
    setNewAssignClassId(selectedClassId);
    setAssignmentLearners([]);
    setNewAssignSelectedLearners([]);
    setAssignmentRosterError('');
    setAssignmentRosterLoading(Boolean(selectedClassId));
    setAssignmentSaveError('');
    setShowCreateAssignmentModal(true);
  };

  const handleToggleSelectAllStudents = () => {
    if (newAssignSelectedLearners.length === assignmentLearners.length) {
      setNewAssignSelectedLearners([]);
    } else {
      setNewAssignSelectedLearners(assignmentLearners.map((learner) => learner.id));
    }
  };

  const handleToggleStudentSelection = (studentId: string) => {
    setNewAssignSelectedLearners((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignClassId || !newAssignLessonId || !newAssignSelectedLearners.length || assignmentRosterLoading || isPublishing) return;

    const targetLesson = lessons.find((l) => l.id === newAssignLessonId);
    setIsPublishing(true);
    setAssignmentSaveError('');
    try {
      await questRepository.createAssignment({
        title: newAssignTitle || `Assignment: ${targetLesson?.title}`,
        classId: newAssignClassId,
        teacherId: teacher?.id,
        lessonId: newAssignLessonId,
        lessonTitle: targetLesson?.title || 'Assigned Lesson',
        skillId: targetLesson?.activities[0]?.primarySkillId,
        assignedLearnerIds: newAssignSelectedLearners,
        dueDate: newAssignDueDate,
        instructions: newAssignInstructions,
      });
    } catch (err) {
      console.error('Failed to publish assignment:', err);
      setAssignmentSaveError('Unable to publish the assignment. Please try again.');
      setIsPublishing(false);
      return;
    }
    setIsPublishing(false);
    setShowCreateAssignmentModal(false);
    setAssignmentSuccessMsg('Assignment published to students! Visible in student dashboards.');
    setTimeout(() => setAssignmentSuccessMsg(''), 4000);
    if (newAssignClassId === selectedClassId) {
      try {
        await refreshClassData(selectedClassId);
      } catch (err) {
        console.error('Failed to refresh classroom after publishing:', err);
        setLoadError('The assignment was published, but classroom data could not be refreshed.');
      }
    }
  };

  // Filter matrix students by search
  const filteredMatrix = matrixData.filter((row) =>
    row.learner.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter skills by category
  const filteredSkills =
    skillCategoryFilter === 'all'
      ? skills
      : skills.filter((s) => s.categoryId === skillCategoryFilter);

  // Calculate summary stats
  const totalStudents = matrixData.length;
  const avgAccuracy =
    totalStudents > 0
      ? Math.round(
          matrixData.reduce((acc, curr) => acc + curr.overallAccuracy, 0) / totalStudents
        )
      : 0;
  const totalQuests = matrixData.reduce((acc, curr) => acc + curr.totalQuestsCompleted, 0);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="w-12 h-12 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-base font-bold text-[#171B37]">Loading Teacher Portal...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 text-center space-y-4">
        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-8 shadow-xs space-y-3">
          <h1 className="text-xl font-black text-[#171B37]">Unable to Load Classroom Portal</h1>
          <p className="text-sm font-semibold text-[#6B6E8A]">{loadError}</p>
          <Button variant="primary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Educator Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#DED5FF]">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#8274D8] mb-1">
            <GraduationCap className="w-4 h-4 text-[#8274D8]" />
            <span>Teacher & Educator Portal</span>
            <span>•</span>
            <span className="text-[#6B6E8A]">{teacher?.name} ({teacher?.schoolName})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#171B37]">
            Classroom Reading Mastery
          </h1>
        </div>

        {/* Global Educator Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#F2EEFF] text-[#171B37] border-2 border-[#DED5FF] px-3.5 py-2 rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer focus-visible:outline-3 focus-visible:outline-[#8274D8]"
            title="Download FERPA-compliant CSV mastery matrix and roster report"
          >
            <Download className="w-4 h-4 text-[#8274D8]" />
            <span>{isExporting ? 'Exporting...' : 'Export Class CSV'}</span>
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAssignmentModal}
            className="inline-flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Assignment</span>
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {assignmentSuccessMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl p-3 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{assignmentSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAssignmentSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Class Selector & Stats Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Class Selector Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs md:col-span-1 space-y-2">
          <span className="text-xs font-black uppercase text-[#6B6E8A]">Active Class</span>
          <select
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full bg-[#F2EEFF] text-[#171B37] font-black text-sm p-2.5 rounded-2xl border border-[#DED5FF] focus:outline-none focus:ring-2 focus:ring-[#8274D8] cursor-pointer"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.grade})
              </option>
            ))}
          </select>
          <div className="text-[11px] text-[#6B6E8A] font-semibold">
            {totalStudents} Enrolled Learners
          </div>
        </div>

        {/* Quick KPI 1: Class Accuracy */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-center justify-between text-[#8274D8] mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-[#6B6E8A]">
              Class Accuracy
            </span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#171B37]">
            {avgAccuracy}%
          </div>
          <div className="text-[11px] text-[#6B6E8A] font-semibold">
            Cohort aggregate performance
          </div>
        </div>

        {/* Quick KPI 2: Completed Quests */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-center justify-between text-[#34D399] mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-[#6B6E8A]">
              Total Quests
            </span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#171B37]">
            {totalQuests}
          </div>
          <div className="text-[11px] text-[#6B6E8A] font-semibold">
            Completed across enrolled learners
          </div>
        </div>

        {/* Quick KPI 3: Active Assignments */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-center justify-between text-[#FFC38E] mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-[#6B6E8A]">
              Assignments
            </span>
            <ClipboardList className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#171B37]">
            {assignments.length} Active
          </div>
          <div className="text-[11px] text-[#6B6E8A] font-semibold">
            Tracked in student dashboards
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b-2 border-[#DED5FF] gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs sm:text-sm border-b-3 transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'border-[#8274D8] text-[#171B37] bg-white rounded-t-2xl'
                : 'border-transparent text-[#6B6E8A] hover:text-[#171B37]'
            }`}
          >
            <Grid className="w-4 h-4 text-[#8274D8]" />
            <span>Mastery Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs sm:text-sm border-b-3 transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'border-[#8274D8] text-[#171B37] bg-white rounded-t-2xl'
                : 'border-transparent text-[#6B6E8A] hover:text-[#171B37]'
            }`}
          >
            <Users className="w-4 h-4 text-[#8274D8]" />
            <span>Student Roster ({totalStudents})</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs sm:text-sm border-b-3 transition-all cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-[#8274D8] text-[#171B37] bg-white rounded-t-2xl'
                : 'border-transparent text-[#6B6E8A] hover:text-[#171B37]'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-[#8274D8]" />
            <span>Assignments ({assignments.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative pb-2">
          <Search className="w-4 h-4 text-[#6B6E8A] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 rounded-2xl bg-white border border-[#DED5FF] text-xs font-semibold text-[#171B37] focus:outline-none focus:ring-2 focus:ring-[#8274D8] w-48 sm:w-60 shadow-xs"
          />
        </div>
      </div>

      {/* TAB 1: STUDENT-BY-SKILL MASTERY MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Matrix Controls & Category Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#DED5FF]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-[#6B6E8A]">Category Filter:</span>
              {[
                { id: 'all', label: 'All 12 Skills' },
                { id: 'letter-sounds', label: 'Sounds (3)' },
                { id: 'phonics-blending', label: 'Phonics (3)' },
                { id: 'sight-words', label: 'Sight Words (3)' },
                { id: 'comprehension', label: 'Stories (3)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSkillCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    skillCategoryFilter === cat.id
                      ? 'bg-[#171B37] text-white shadow-xs'
                      : 'bg-[#F2EEFF] text-[#6B6E8A] hover:text-[#171B37]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Accessible Legend */}
            <div className="flex items-center gap-2 text-[10px] font-black flex-wrap">
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                Mastered (≥90%)
              </span>
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                Proficient (75-89%)
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                Developing (60-74%)
              </span>
              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                Needs Focus (&lt;60%)
              </span>
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-300">
                Unstarted (-)
              </span>
            </div>
          </div>

          {/* Mastery Matrix Table with Sticky Student Column and Accessible Labels */}
          <div className="bg-white rounded-3xl border-2 border-[#DED5FF] shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-xs border-collapse" aria-label="Student-by-Skill Mastery Matrix">
                <thead>
                  <tr className="bg-[#171B37] text-white">
                    <th className="py-3 px-4 font-black sticky left-0 bg-[#171B37] z-20 min-w-[180px] shadow-sm">
                      Student Name
                    </th>
                    <th className="py-3 px-3 font-black text-center min-w-[70px]">
                      Acc %
                    </th>
                    {filteredSkills.map((s) => (
                      <th
                        key={s.id}
                        className="py-3 px-2 font-black text-center min-w-[105px] border-l border-white/10"
                        title={`${s.name} (${s.code}): ${s.description}`}
                      >
                        <div className="text-[10px] text-[#FFC38E] font-bold uppercase">{s.code}</div>
                        <div className="truncate max-w-[100px] text-[11px]">{s.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED5FF]">
                  {filteredMatrix.map((row) => (
                    <tr key={row.learner.id} className="hover:bg-[#F2EEFF]/40 transition-colors">
                      {/* Sticky Student Column */}
                      <td className="py-3 px-4 sticky left-0 bg-white hover:bg-[#F2EEFF]/60 z-10 font-bold border-r border-[#DED5FF] shadow-xs">
                        <button
                          onClick={() => handleOpenStudentDetail(row.learner)}
                          className="flex items-center gap-2 text-left group cursor-pointer"
                        >
                          <span className="text-lg select-none">{row.learner.avatar}</span>
                          <div>
                            <div className="text-xs font-black text-[#171B37] group-hover:text-[#8274D8] transition-colors">
                              {row.learner.name}
                            </div>
                            <div className="text-[10px] text-[#6B6E8A]">
                              {row.learner.gradeLevel}
                            </div>
                          </div>
                        </button>
                      </td>

                      {/* Accuracy */}
                      <td className="py-3 px-3 text-center font-black text-[#171B37] bg-[#F2EEFF]/20">
                        {row.overallAccuracy}%
                      </td>

                      {/* Skill Cells with Text Labels alongside colors */}
                      {filteredSkills.map((s) => {
                        const m = row.skillsMastery[s.id];
                        const isUnknown = !m || m.evidenceStatus === 'unknown';
                        const isConfirmed = m?.isConfirmedMastered;
                        const isProvisional = m?.evidenceStatus === 'provisional';
                        const score = m?.score !== null && m?.score !== undefined ? Math.round(m.score) : null;
                        const band = m?.band;

                        let cellClass = 'bg-gray-50 text-gray-500 border-gray-200';
                        let label = 'Unstarted';

                        if (!isUnknown) {
                          if (isConfirmed || (score !== null && score >= 90)) {
                            cellClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                            label = isConfirmed ? 'Mastered' : `${score}%`;
                          } else if (score !== null && score >= 75) {
                            cellClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
                            label = `${score}% Prof.`;
                          } else if (score !== null && score >= 60) {
                            cellClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                            label = `${score}% Dev.`;
                          } else {
                            cellClass = 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
                            label = `${score}% Focus`;
                          }

                          if (isProvisional) {
                            label = `${score ?? '?'}% Prov.`;
                          }
                        }

                        return (
                          <td
                            key={s.id}
                            className="py-2.5 px-1.5 text-center border-l border-[#DED5FF]"
                          >
                            <div
                              onClick={() => handleOpenStudentDetail(row.learner)}
                              className={`p-1.5 rounded-xl border text-[10px] leading-tight cursor-pointer hover:scale-105 transition-transform ${cellClass}`}
                              title={`${row.learner.name} · ${s.name}: ${label} (${m?.totalAttemptCount ?? 0} attempts)`}
                            >
                              <div className="font-extrabold">{label}</div>
                              {m?.isReviewDue && (
                                <div className="text-[9px] text-amber-900 font-black">
                                  Review Due ⏰
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROSTER VIEW */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-3xl border-2 border-[#DED5FF] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-[#171B37]">
              Class Roster & Learning Profiles
            </h3>
            <span className="text-xs font-bold text-[#8274D8] bg-[#F2EEFF] px-2.5 py-1 rounded-xl">
              {filteredMatrix.length} students
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Student roster table">
              <thead>
                <tr className="border-b-2 border-[#DED5FF] text-[#6B6E8A] font-black uppercase text-[10px]">
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Grade & Level</th>
                  <th className="py-3 px-3 text-center">Quests Completed</th>
                  <th className="py-3 px-3 text-center">Active Practice</th>
                  <th className="py-3 px-3 text-center">Overall Accuracy</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EEFF]">
                {filteredMatrix.map((row) => (
                  <tr key={row.learner.id} className="hover:bg-[#F2EEFF]/40">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl select-none">{row.learner.avatar}</span>
                        <div>
                          <div className="font-black text-[#171B37] text-sm">
                            {row.learner.name}
                          </div>
                          <div className="text-[10px] text-[#6B6E8A]">
                            ID: {row.learner.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#34364B]">
                      {row.learner.gradeLevel} · {row.learner.readingLevelId.toUpperCase()}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#171B37]">
                      {row.totalQuestsCompleted} quests
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#171B37]">
                      {row.totalActiveMinutes} mins
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-black px-2.5 py-1 rounded-full text-[11px] bg-[#F2EEFF] text-[#171B37]">
                        {row.overallAccuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenStudentDetail(row.learner)}
                        className="px-3 py-1.5 rounded-xl font-black text-xs bg-[#F2EEFF] hover:bg-[#8274D8] hover:text-white text-[#171B37] transition-all cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS VIEW */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#171B37]">
                Active Class Assignments
              </h3>
              <p className="text-xs text-[#6B6E8A]">
                Assigned quests appear in student learning dashboards
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAssignmentModal}
              className="inline-flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Assignment</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((assign) => {
              const totalAssigned = assign.assignedLearnerIds.length;
              const totalDone = assign.completedLearnerIds.length;
              const completionPct = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0;

              return (
                <div
                  key={assign.id}
                  className="bg-white rounded-3xl p-5 border-2 border-[#DED5FF] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#8274D8] bg-[#F2EEFF] px-2 py-0.5 rounded-full">
                        Assigned Quest
                      </span>
                      <h4 className="text-sm font-black text-[#171B37] mt-1">
                        {assign.title}
                      </h4>
                      <p className="text-xs text-[#6B6E8A] font-semibold">
                        Lesson: {assign.lessonTitle}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        totalDone >= totalAssigned
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {totalDone >= totalAssigned ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  {assign.instructions && (
                    <div className="text-xs text-[#34364B] bg-[#F2EEFF]/60 p-2.5 rounded-xl border border-[#DED5FF]/60">
                      <strong>Teacher Note:</strong> {assign.instructions}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-[#6B6E8A]">Student Completion:</span>
                      <span className="text-[#171B37]">
                        {totalDone} of {totalAssigned} Students ({completionPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F2EEFF] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#8274D8] h-full rounded-full transition-all"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B6E8A] pt-2 border-t border-[#F2EEFF]">
                    <span>Due: <strong>{assign.dueDate || 'No due date'}</strong></span>
                    <span>Created: {new Date(assign.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudentForDetail && (
        <div
          className="fixed inset-0 z-50 bg-[#171B37]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-detail-title"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border-2 border-[#DED5FF] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#DED5FF] pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl select-none">{selectedStudentForDetail.avatar}</span>
                <div>
                  <h3 id="student-detail-title" className="text-lg font-black text-[#171B37]">
                    {selectedStudentForDetail.name}
                  </h3>
                  <div className="text-xs text-[#6B6E8A] font-bold">
                    {selectedStudentForDetail.gradeLevel} · {selectedStudentForDetail.readingLevelId.toUpperCase()} · Streak: {selectedStudentForDetail.currentStreakDays} days
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="p-1 rounded-xl hover:bg-[#F2EEFF] text-[#6B6E8A] hover:text-[#171B37] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Skills Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-[#8274D8]">
                Skills & Evidence Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {studentDetailMastery.map((m) => (
                  <div
                    key={m.skillId}
                    className="p-2.5 rounded-xl border border-[#DED5FF] bg-[#F2EEFF]/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#171B37] truncate">{m.skillName}</span>
                      <span className="text-[10px] font-black uppercase">
                        {m.isConfirmedMastered ? 'Mastered' : m.band}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6B6E8A]">
                      <span>Score: {m.score !== null ? `${Math.round(m.score)}%` : 'Provisional'}</span>
                      <span>{m.totalAttemptCount} attempts ({m.sessionCount} sessions)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Attempts Log */}
            <div className="space-y-2 border-t border-[#DED5FF] pt-3">
              <h4 className="text-xs font-black uppercase text-[#8274D8]">
                Recent Attempt Records
              </h4>
              {studentRecentAttempts.length === 0 ? (
                <div className="text-xs text-[#6B6E8A] italic">No recent attempts recorded yet.</div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {studentRecentAttempts.slice(0, 8).map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#DED5FF] text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#171B37]">{a.lessonTitle}</div>
                        <div className="text-[10px] text-[#6B6E8A]">{a.skillName}</div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          a.attempt.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {a.attempt.isCorrect ? 'Correct ✓' : 'Practice Needed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#DED5FF]">
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="px-4 py-2 rounded-2xl bg-[#171B37] text-white font-black text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      {showCreateAssignmentModal && (
        <div
          className="fixed inset-0 z-50 bg-[#171B37]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-assign-title"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border-2 border-[#DED5FF] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DED5FF] pb-3">
              <h3 id="create-assign-title" className="text-base sm:text-lg font-black text-[#171B37]">
                Create New Class Assignment
              </h3>
              <button
                onClick={() => setShowCreateAssignmentModal(false)}
                disabled={isPublishing}
                aria-label="Close assignment dialog"
                className="p-1 rounded-xl hover:bg-[#F2EEFF] text-[#6B6E8A] hover:text-[#171B37] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              {/* Assignment Title */}
              <div>
                <label className="block font-black text-[#171B37] mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={newAssignTitle}
                  onChange={(e) => setNewAssignTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DED5FF] font-semibold text-[#171B37] focus:outline-none focus:ring-2 focus:ring-[#8274D8]"
                  placeholder="e.g. Initial Sounds Safari Challenge"
                />
              </div>

              {/* Lesson Dropdown */}
              <div>
                <label className="block font-black text-[#171B37] mb-1">Target Curriculum Lesson</label>
                <select
                  value={newAssignLessonId}
                  onChange={(e) => {
                    setNewAssignLessonId(e.target.value);
                    const l = lessons.find((x) => x.id === e.target.value);
                    if (l) setNewAssignTitle(`Quest: ${l.title}`);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#DED5FF] font-bold text-[#171B37] focus:outline-none focus:ring-2 focus:ring-[#8274D8] bg-[#F2EEFF]"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.categoryName} · {l.title} ({l.readingLevelName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assignment-class" className="block font-black text-[#171B37] mb-1">Classroom</label>
                <select
                  id="assignment-class"
                  value={newAssignClassId}
                  disabled={classes.length === 0 || isPublishing}
                  onChange={(e) => {
                    setAssignmentLearners([]);
                    setNewAssignSelectedLearners([]);
                    setAssignmentRosterError('');
                    setAssignmentRosterLoading(Boolean(e.target.value));
                    setNewAssignClassId(e.target.value);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#DED5FF] font-bold text-[#171B37] focus:outline-none focus:ring-2 focus:ring-[#8274D8] bg-[#F2EEFF]"
                >
                  {classes.length === 0 && <option value="">No classrooms available</option>}
                  {classes.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name} ({classroom.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Learners Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-[#171B37]">Assign To Students</span>
                  {assignmentLearners.length > 0 && (
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={handleToggleSelectAllStudents}
                      className="text-[#8274D8] font-bold text-[11px] underline cursor-pointer"
                    >
                      {newAssignSelectedLearners.length === assignmentLearners.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#F2EEFF]/40 rounded-xl border border-[#DED5FF]" aria-live="polite">
                  {!newAssignClassId && <p className="col-span-2 text-[#6B6E8A]">No classrooms available. Contact an administrator to set up a classroom and enroll students.</p>}
                  {newAssignClassId && assignmentRosterLoading && <p className="col-span-2 text-[#6B6E8A]">Loading students...</p>}
                  {newAssignClassId && !assignmentRosterLoading && assignmentRosterError && (
                    <div className="col-span-2 text-rose-700">
                      <p>{assignmentRosterError}</p>
                      <button type="button" className="underline font-bold" onClick={() => setAssignmentRosterRetry((n) => n + 1)}>Retry</button>
                    </div>
                  )}
                  {newAssignClassId && !assignmentRosterLoading && !assignmentRosterError && assignmentLearners.length === 0 && (
                    <p className="col-span-2 text-[#6B6E8A]">No students are enrolled in this class. Contact an administrator to enroll students.</p>
                  )}
                  {assignmentLearners.map((learner) => {
                    const isChecked = newAssignSelectedLearners.includes(learner.id);
                    return (
                      <label
                        key={learner.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isPublishing}
                          onChange={() => handleToggleStudentSelection(learner.id)}
                          className="rounded text-[#8274D8] focus:ring-[#8274D8] w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-[#171B37] text-xs">
                          {learner.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Due Date & Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-[#171B37] mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={newAssignDueDate}
                    onChange={(e) => setNewAssignDueDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#DED5FF] font-semibold text-[#171B37]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-[#171B37] mb-1">Educator Note / Instructions</label>
                <textarea
                  rows={2}
                  value={newAssignInstructions}
                  onChange={(e) => setNewAssignInstructions(e.target.value)}
                  placeholder="e.g. Please practice this quest before Friday small groups."
                  className="w-full p-2.5 rounded-xl border border-[#DED5FF] font-semibold text-[#171B37]"
                />
              </div>

              {assignmentSaveError && <p role="alert" className="text-rose-700 font-semibold">{assignmentSaveError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DED5FF]">
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => setShowCreateAssignmentModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-[#6B6E8A] hover:text-[#171B37] cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newAssignClassId || !newAssignLessonId || assignmentRosterLoading || newAssignSelectedLearners.length === 0}
                  isLoading={isPublishing}
                >
                  Publish Assignment ({newAssignSelectedLearners.length} Students)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
