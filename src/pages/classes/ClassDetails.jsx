import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getClassById, getClasses } from "./classService";
import { getAllStudents } from "../students/studentService";
import { promoteStudents } from "../students/enrollmentService";
import { getSettings } from "../settings/settingService";
import { ClassDetailsSkeleton } from "../../components/common/Skeleton";
import {
  HiCollection,
  HiArrowLeft,
  HiOutlineAcademicCap,
  HiArrowRight,
  HiLightningBolt,
  HiX,
  HiCheckCircle,
  HiExclamationCircle,
  HiUserGroup,
  HiChevronDown,
  HiSearch,
  HiInformationCircle,
  HiStar,
} from "react-icons/hi";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

/**
 * Given a class name like "Primary 1A" or "JSS 2B", extract the
 * numeric level and the arm letter so we can suggest the next class.
 *
 * Returns { level: number|null, arm: string, prefix: string }
 * e.g. "Primary 1A" → { prefix: "Primary", level: 1, arm: "A" }
 *      "JSS 2B"     → { prefix: "JSS",     level: 2, arm: "B" }
 *      "Nursery 1"  → { prefix: "Nursery",  level: 1, arm: ""  }
 */
function parseClassName(name = "") {
  const trimmed = name.trim();
  // Match: <word(s)> <digit(s)> <optional arm letter>
  const match = trimmed.match(/^(.*?)(\d+)\s*([A-Za-z]?)$/);
  if (!match) return { prefix: trimmed, level: null, arm: "" };
  return {
    prefix: match[1].trim(),
    level: parseInt(match[2], 10),
    arm: match[3].toUpperCase(),
  };
}

/**
 * From all available classes, find the best promotion target for a given class.
 * Logic: same prefix, level + 1, same arm.
 * Falls back to same prefix + level + 1 (any arm) if exact arm not found.
 */
function suggestNextClass(currentClass, allClasses) {
  if (!currentClass) return null;
  const { prefix, level, arm } = parseClassName(currentClass.name);
  if (level === null) return null;

  const nextLevel = level + 1;
  const others = allClasses.filter((c) => c.id !== currentClass.id);

  // Exact match: same prefix, same arm, next level
  const exact = others.find((c) => {
    const p = parseClassName(c.name);
    return p.prefix === prefix && p.level === nextLevel && p.arm === arm;
  });
  if (exact) return exact;

  // Fallback: same prefix, next level (any arm)
  return (
    others.find((c) => {
      const p = parseClassName(c.name);
      return p.prefix === prefix && p.level === nextLevel;
    }) ?? null
  );
}

/** Increment a session string "2024/2025" → "2025/2026" */
function nextSession(session = "") {
  const parts = session.split("/");
  if (parts.length === 2) {
    const y1 = parseInt(parts[0]);
    const y2 = parseInt(parts[1]);
    if (!isNaN(y1) && !isNaN(y2)) return `${y1 + 1}/${y2 + 1}`;
  }
  return session;
}

function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
export default function ClassDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // Promotion modal state
  const [showPromote, setShowPromote] = useState(false);
  const [targetClassId, setTargetClassId] = useState("");
  const [newSession, setNewSession] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState(null);
  const [step, setStep] = useState(1); // 1 = configure, 2 = confirm
  const [filterQuery, setFilterQuery] = useState("");

  /* ── Load ── */
  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, allStudents, classes, appSettings] = await Promise.all([
        getClassById(id),
        getAllStudents(),
        getClasses(),
        getSettings(),
      ]);
      setClassData(cls);
      setStudents((allStudents || []).filter((s) => s.classId === id));
      setAllClasses(classes || []);
      setSettings(appSettings || {});

      // If ?promote=true in URL, auto-open the modal
      if (searchParams.get("promote") === "true" && cls) {
        openPromotion(cls, classes || [], appSettings || {});
      }
    } catch (err) {
      console.error("Failed to load class details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  /* ── Derived ── */
  const suggested = useMemo(() => suggestNextClass(classData, allClasses), [classData, allClasses]);
  const targetClass = useMemo(
    () => allClasses.find((c) => c.id === targetClassId) ?? null,
    [allClasses, targetClassId],
  );

  const otherClasses = useMemo(
    () => allClasses.filter((c) => c.id !== id).sort((a, b) => a.name.localeCompare(b.name)),
    [allClasses, id],
  );

  const filteredStudents = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.admissionNo || "").toLowerCase().includes(q),
    );
  }, [students, filterQuery]);

  const totalSelected = selectedIds.size;
  const allFiltered =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));
  const someSelected = filteredStudents.some((s) => selectedIds.has(s.id));

  /* ── Handlers ── */
  const openPromotion = (cls = classData, classes = allClasses, appSettings = settings) => {
    const sugg = suggestNextClass(cls, classes);
    const session = appSettings?.academicYear || cls?.session || "";
    setTargetClassId(sugg?.id ?? "");
    setNewSession(nextSession(session));
    setSelectedIds(new Set(students.map((s) => s.id))); // select all by default
    setPromoteResult(null);
    setStep(1);
    setFilterQuery("");
    setShowPromote(true);
  };

  const closePromotion = () => {
    setShowPromote(false);
    setStep(1);
    setPromoteResult(null);
  };

  const toggleStudent = (sid) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });

  const toggleAllFiltered = () => {
    if (allFiltered) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const handlePromote = async () => {
    if (!targetClassId || !newSession.trim() || totalSelected === 0) return;
    setPromoting(true);
    try {
      const result = await promoteStudents([...selectedIds], targetClassId, newSession.trim());
      setPromoteResult({ success: true, count: result.promoted.length, failed: result.failed });
      // Refresh list so promoted students disappear from this class view
      await loadData();
    } catch (err) {
      setPromoteResult({ success: false, error: err.message || "Promotion failed." });
    } finally {
      setPromoting(false);
    }
  };

  const currentSession = settings?.academicYear || classData?.session || "";

  // Promote button is only visible when the current term is the 3rd term
  // AND the term end date has already passed.
  const isThirdTermEnded = (() => {
    if (settings?.currentTerm !== "3rd Term") return false;

    const termEndDate = toDateValue(settings?.termEndDate);
    if (!termEndDate) return false;

    // Treat the configured term end date as the end of that calendar day,
    // so promotion only opens after the full final day has passed.
    const termEndCutoff = new Date(termEndDate);
    termEndCutoff.setHours(23, 59, 59, 999);

    return Date.now() > termEndCutoff.getTime();
  })();
  const { prefix: curPrefix, level: curLevel, arm: curArm } = parseClassName(classData?.name || "");

  /* ── Render ── */
  if (loading) return <ClassDetailsSkeleton />;

  if (!classData)
    return (
      <div className='empty-state'>
        <p>Class not found.</p>
        <Link to='/classes' className='back-link'>
          <HiArrowLeft /> Back to Classes
        </Link>
      </div>
    );

  return (
    <div className='class-details-container'>
      {/* ── Header ── */}
      <div className='details-header'>
        <div className='header-left'>
          <HiCollection className='main-icon' />
          <div>
            <h2>{classData.name}</h2>
            <p style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
              {classData.section && (
                <span className='cd-chip cd-chip-blue'>{classData.section}</span>
              )}
              {currentSession && <span className='cd-chip cd-chip-green'>{currentSession}</span>}
              <span>Class details &amp; enrolled students</span>
            </p>
          </div>
        </div>
        <div className='cd-header-btns'>
          {/* Promote button only appears when 3rd term has ended */}
          {isThirdTermEnded && students.length > 0 && (
            <button className='cd-promote-btn' onClick={() => openPromotion()}>
              <HiLightningBolt /> Promote Students
            </button>
          )}
          <Link to='/classes' className='back-btn'>
            <HiArrowLeft /> Back
          </Link>
        </div>
      </div>

      {/* ── Info cards ── */}
      <div className='details-grid'>
        {[
          { label: "Class Name", value: classData.name },
          { label: "Arm / Section", value: classData.section || curArm || "—" },
          { label: "Academic Session", value: currentSession || "—" },
          {
            label: "Enrolled",
            value: `${students.length} student${students.length !== 1 ? "s" : ""}`,
          },
        ].map(({ label, value }) => (
          <div key={label} className='info-card'>
            <label>{label}</label>
            <h3>{value}</h3>
          </div>
        ))}
      </div>

      {/* ── Promotion tip / readiness banner ── */}
      {students.length > 0 && (
        <>
          {/* Eligible: 3rd term AND term end date has passed */}
          {isThirdTermEnded ? (
            <div className='cd-promote-ready-banner'>
              <HiLightningBolt />
              <div>
                <strong>Promotion window is open</strong>
                <p>
                  The 3rd term has ended. You can now promote students from{" "}
                  <strong>{classData.name}</strong>
                  {suggested && (
                    <>
                      {" "}
                      to <strong>{suggested.name}</strong>
                    </>
                  )}{" "}
                  for the <strong>{nextSession(currentSession)}</strong> session.
                </p>
              </div>
              <button className='cd-tip-btn' onClick={() => openPromotion()}>
                Promote now <HiArrowRight />
              </button>
            </div>
          ) : settings.currentTerm === "3rd Term" && settings.termEndDate ? (
            /* In 3rd term but hasn't ended yet */
            <div className='cd-tip-banner cd-tip-banner--info'>
              <HiInformationCircle className='cd-tip-icon' />
              <div>
                <strong>Promotion available after 3rd term ends</strong>
                <p>
                  Term end date is{" "}
                  <strong>
                    {new Date(settings.termEndDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                  . The Promote button will appear once the term closes.
                </p>
              </div>
            </div>
          ) : settings.currentTerm && settings.currentTerm !== "3rd Term" ? (
            /* Not in 3rd term */
            <div className='cd-tip-banner cd-tip-banner--info'>
              <HiInformationCircle className='cd-tip-icon' />
              <div>
                Currently in <strong>{settings.currentTerm || "—"}</strong>. Promotion is only
                available after the <strong>3rd term</strong> ends.
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ── Student table ── */}
      <div className='table-card'>
        <div className='card-header' style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <HiOutlineAcademicCap />
            <h3>Students in {classData.name}</h3>
            <span className='cd-count-chip'>{students.length}</span>
          </div>
        </div>
        <table className='data-table'>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Admission No</th>
              <th>Session</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className='student-profile'>
                      <div className='student-initials'>
                        {s.firstName?.[0]}
                        {s.lastName?.[0]}
                      </div>
                      <div className='student-name-meta'>
                        <span className='full-name'>
                          {s.firstName} {s.lastName}
                        </span>
                        {s.admissionNo && <span className='id-sub'>No. {s.admissionNo}</span>}
                      </div>
                    </div>
                  </td>
                  <td>{s.admissionNo || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                  <td>{s.session}</td>
                  <td>
                    <span className='status-badge active'>{s.status || "Active"}</span>
                  </td>
                  <td>
                    <Link to={`/students/${s.id}`} className='view-btn'>
                      <HiArrowRight /> View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan='5' className='empty-row'>
                  No students assigned to this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════
           PROMOTION MODAL
      ═══════════════════════════════════════════════════════ */}
      {showPromote && (
        <div className='cd-overlay' onClick={closePromotion}>
          <div className='cd-modal' onClick={(e) => e.stopPropagation()}>
            {/* ── Modal header ── */}
            <div className='cd-modal-hdr'>
              <div className='cd-modal-hdr-left'>
                <div className='cd-modal-icon'>
                  <HiLightningBolt />
                </div>
                <div>
                  <h3>Promote Students</h3>
                  <p>
                    Move students from <strong>{classData.name}</strong> to the next class with an
                    updated academic session.
                  </p>
                </div>
              </div>
              <button className='cd-x-btn' onClick={closePromotion}>
                <HiX />
              </button>
            </div>

            {/* ── Session/class context bar ── */}
            <div className='cd-context-bar'>
              <div className='cd-context-item'>
                <span className='cd-context-label'>From</span>
                <span className='cd-context-val'>{classData.name}</span>
              </div>
              <HiArrowRight className='cd-context-arrow' />
              <div className='cd-context-item'>
                <span className='cd-context-label'>To</span>
                <span className='cd-context-val cd-context-val--teal'>
                  {targetClass ? targetClass.name : "— not selected —"}
                </span>
              </div>
              <div className='cd-context-sep' />
              <div className='cd-context-item'>
                <span className='cd-context-label'>Session</span>
                <span className='cd-context-val'>{currentSession || "—"}</span>
              </div>
              <HiArrowRight className='cd-context-arrow' />
              <div className='cd-context-item'>
                <span className='cd-context-label'>New Session</span>
                <span className='cd-context-val cd-context-val--teal'>{newSession || "—"}</span>
              </div>
            </div>

            {/* ── Result banner ── */}
            {promoteResult && (
              <div className={`cd-result-banner ${promoteResult.success ? "success" : "error"}`}>
                {promoteResult.success ? <HiCheckCircle /> : <HiExclamationCircle />}
                <div className='cd-result-text'>
                  {promoteResult.success ? (
                    <>
                      <strong>
                        {promoteResult.count} student{promoteResult.count !== 1 ? "s" : ""} promoted
                      </strong>{" "}
                      to <strong>{targetClass?.name}</strong> for <strong>{newSession}</strong>.
                      {promoteResult.failed?.length > 0 && (
                        <span className='cd-result-warn'>
                          {" "}
                          ({promoteResult.failed.length} failed — check console)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>Error:</strong> {promoteResult.error}
                    </>
                  )}
                </div>
                {promoteResult.success && (
                  <button className='cd-result-done' onClick={closePromotion}>
                    Done
                  </button>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════
                 STEP 1 — Configure
            ════════════════════════════════════════ */}
            {!promoteResult && step === 1 && (
              <>
                <div className='cd-modal-body'>
                  {/* Info note */}
                  <div className='cd-note'>
                    <HiInformationCircle />
                    <span>
                      A <strong>section</strong> spans all 3 terms (1st, 2nd, 3rd term). When a
                      section ends, promote students to the next class level. Existing fee and
                      payment records are never modified.
                    </span>
                  </div>

                  {/* Config row */}
                  <div className='cd-config-row'>
                    {/* Destination class */}
                    <div className='cd-field'>
                      <label className='cd-label'>
                        Destination class <span className='cd-req'>*</span>
                      </label>
                      {/* Suggested class shortcut */}
                      {suggested && (
                        <div className='cd-suggested'>
                          <HiStar className='cd-suggested-star' />
                          <span>Suggested:</span>
                          <button
                            className={`cd-suggested-btn ${targetClassId === suggested.id ? "active" : ""}`}
                            onClick={() => setTargetClassId(suggested.id)}
                          >
                            {suggested.name}
                            {targetClassId === suggested.id && <HiCheckCircle />}
                          </button>
                        </div>
                      )}
                      <div className='cd-select-wrap'>
                        <select
                          value={targetClassId}
                          onChange={(e) => setTargetClassId(e.target.value)}
                        >
                          <option value=''>— Choose class —</option>
                          {otherClasses.map((c) => {
                            const isSugg = c.id === suggested?.id;
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.section ? ` (${c.section})` : ""}
                                {isSugg ? " ★ suggested" : ""}
                              </option>
                            );
                          })}
                        </select>
                        <HiChevronDown className='cd-select-chevron' />
                      </div>
                    </div>

                    {/* New session */}
                    <div className='cd-field'>
                      <label className='cd-label'>
                        New academic session <span className='cd-req'>*</span>
                      </label>
                      <input
                        className='cd-input'
                        type='text'
                        value={newSession}
                        onChange={(e) => setNewSession(e.target.value)}
                        placeholder='e.g. 2025/2026'
                      />
                      <span className='cd-hint'>
                        Current: <strong>{currentSession || "—"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* ── Student selector ── */}
                  <div className='cd-selector'>
                    <div className='cd-selector-hdr'>
                      <div className='cd-selector-title'>
                        <HiUserGroup />
                        <span>Select students to promote</span>
                      </div>
                      <div className='cd-selector-ctrl'>
                        <span className='cd-sel-count'>
                          <strong>{totalSelected}</strong> of {students.length} selected
                        </span>
                        <button className='cd-sel-toggle' onClick={toggleAllFiltered}>
                          {allFiltered ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                    </div>

                    {/* Search filter */}
                    {students.length > 5 && (
                      <div className='cd-filter-row'>
                        <HiSearch className='cd-filter-icon' />
                        <input
                          type='text'
                          placeholder='Filter by name or admission no…'
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          className='cd-filter-input'
                        />
                      </div>
                    )}

                    {/* Student list */}
                    <div className='cd-student-list'>
                      {filteredStudents.length === 0 ? (
                        <p className='cd-empty'>No students match your filter.</p>
                      ) : (
                        filteredStudents.map((s) => {
                          const checked = selectedIds.has(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`cd-student-row ${checked ? "checked" : ""}`}
                            >
                              <input
                                type='checkbox'
                                checked={checked}
                                onChange={() => toggleStudent(s.id)}
                                className='cd-checkbox'
                              />
                              <div className={`cd-avatar ${checked ? "cd-avatar--teal" : ""}`}>
                                {s.firstName?.[0]}
                                {s.lastName?.[0]}
                              </div>
                              <div className='cd-s-info'>
                                <span className='cd-s-name'>
                                  {s.firstName} {s.lastName}
                                </span>
                                {s.admissionNo && (
                                  <span className='cd-s-meta'>No. {s.admissionNo}</span>
                                )}
                              </div>
                              {checked && <HiCheckCircle className='cd-s-check' />}
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Excluded count */}
                    {totalSelected < students.length && (
                      <div className='cd-excluded-note'>
                        <HiExclamationCircle />
                        {students.length - totalSelected} student
                        {students.length - totalSelected !== 1 ? "s" : ""} will be{" "}
                        <strong>excluded</strong> and stay in {classData.name}.
                      </div>
                    )}
                  </div>
                </div>

                <div className='cd-modal-footer'>
                  <button className='cd-btn-ghost' onClick={closePromotion}>
                    Cancel
                  </button>
                  <button
                    className='cd-btn-primary'
                    disabled={!targetClassId || !newSession.trim() || totalSelected === 0}
                    onClick={() => setStep(2)}
                  >
                    Review &amp; Confirm <HiArrowRight />
                  </button>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════
                 STEP 2 — Confirm
            ════════════════════════════════════════ */}
            {!promoteResult && step === 2 && (
              <>
                <div className='cd-modal-body cd-confirm-body'>
                  <div className='cd-confirm-icon-wrap'>
                    <HiLightningBolt />
                  </div>

                  <h4 className='cd-confirm-title'>Confirm promotion</h4>
                  <p className='cd-confirm-subtitle'>
                    {totalSelected} student{totalSelected !== 1 ? "s" : ""} will be moved from{" "}
                    <strong>{classData.name}</strong> → <strong>{targetClass?.name}</strong>.
                  </p>

                  {/* Summary table */}
                  <div className='cd-confirm-table'>
                    {[
                      ["From class", classData.name],
                      [
                        "To class",
                        `${targetClass?.name}${targetClass?.section ? ` (${targetClass.section})` : ""}`,
                      ],
                      ["Current session", currentSession || "—"],
                      ["New session", newSession],
                      [
                        "Students",
                        `${totalSelected} selected${students.length - totalSelected > 0 ? ` · ${students.length - totalSelected} excluded` : ""}`,
                      ],
                    ].map(([k, v]) => (
                      <div key={k} className='cd-confirm-row'>
                        <span>{k}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Students being promoted */}
                  <div className='cd-confirm-students'>
                    <p className='cd-confirm-students-title'>
                      Students being promoted ({totalSelected})
                    </p>
                    <div className='cd-confirm-student-chips'>
                      {students
                        .filter((s) => selectedIds.has(s.id))
                        .map((s) => (
                          <span key={s.id} className='cd-name-chip'>
                            {s.firstName} {s.lastName}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Warning */}
                  <div className='cd-warning-box'>
                    <HiExclamationCircle />
                    <span>
                      Each student's <code>classId</code> and <code>session</code> will be updated.
                      Fee and payment records for the current session remain unchanged. This action
                      can be reversed manually if needed.
                    </span>
                  </div>
                </div>

                <div className='cd-modal-footer'>
                  <button className='cd-btn-ghost' onClick={() => setStep(1)} disabled={promoting}>
                    ← Back
                  </button>
                  <button className='cd-btn-confirm' onClick={handlePromote} disabled={promoting}>
                    {promoting ? (
                      <>
                        <div className='cd-spinner' /> Promoting…
                      </>
                    ) : (
                      <>
                        <HiCheckCircle /> Promote {totalSelected} Student
                        {totalSelected !== 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
