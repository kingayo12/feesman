import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getClassById, getClasses } from "./classService";
import { getAllStudents, promoteStudents } from "../students/studentService";
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
    if (!settings?.termEndDate) return false;
    return new Date(settings.termEndDate) < new Date();
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

      {/* ── Styles ── */}
      <style>{`
        .class-details-container { max-width: 1100px; margin: 0 auto; }

        /* Header */
        .details-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.75rem; gap:1rem; flex-wrap:wrap; }
        .header-left { display:flex; align-items:flex-start; gap:1rem; }
        .cd-header-btns { display:flex; gap:.6rem; align-items:center; flex-wrap:wrap; }
        .cd-promote-btn { display:inline-flex; align-items:center; gap:.4rem; padding:.55rem 1.1rem; background:#0d9488; color:#fff; border:none; border-radius:10px; font-size:.875rem; font-weight:600; cursor:pointer; transition:background .15s; }
        .cd-promote-btn:hover { background:#0f766e; }

        /* Chips */
        .cd-chip { display:inline-block; font-size:.72rem; font-weight:600; padding:2px 9px; border-radius:99px; }
        .cd-chip-blue  { background:#eef2ff; color:#3730a3; }
        .cd-chip-green { background:#f0fdf4; color:#15803d; }
        .cd-count-chip { background:#e0e7ff; color:#3730a3; font-size:.7rem; font-weight:700; padding:2px 8px; border-radius:99px; }

        /* Info grid */
        .details-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:1rem; margin-bottom:1.5rem; }
        .info-card { background:#fff; border-radius:10px; padding:1.1rem; box-shadow:0 2px 8px rgba(0,0,0,.05); }
        .info-card label { font-size:.72rem; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:.3rem; }
        .info-card h3 { margin:0; font-size:1.1rem; color:#111827; font-weight:700; }
        [data-theme="dark"] .info-card { background:var(--bg-secondary); }
        [data-theme="dark"] .info-card label { color:var(--text-secondary); }
        [data-theme="dark"] .info-card h3 { color:var(--text-primary); }

        /* Tip / readiness banners */
        .cd-promote-ready-banner { display:flex; align-items:flex-start; gap:.85rem; padding:.9rem 1.1rem; background:#f0fdf4; border:1px solid #86efac; border-radius:12px; margin-bottom:1.5rem; flex-wrap:wrap; }
        .cd-promote-ready-banner svg { color:#16a34a; font-size:1.2rem; flex-shrink:0; margin-top:2px; }
        .cd-promote-ready-banner > div { flex:1; font-size:.83rem; color:#15803d; line-height:1.5; min-width:200px; }
        .cd-promote-ready-banner > div p { margin:.2rem 0 0; }
        .cd-tip-banner { display:flex; align-items:flex-start; gap:.75rem; padding:.8rem 1rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; margin-bottom:1.5rem; }
        .cd-tip-banner--info { background:#eff6ff; border-color:#bfdbfe; }
        .cd-tip-icon { font-size:1rem; flex-shrink:0; margin-top:2px; color:#2563eb; }
        .cd-tip-banner > div { flex:1; font-size:.8rem; color:#1d4ed8; line-height:1.5; }
        .cd-tip-banner > div p { margin:.2rem 0 0; }
        .cd-tip-btn { display:inline-flex; align-items:center; gap:.35rem; padding:.45rem .9rem; background:#16a34a; color:#fff; border:none; border-radius:8px; font-size:.8rem; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0; }
        .cd-tip-btn:hover { background:#15803d; }
        [data-theme="dark"] .cd-promote-ready-banner { background:#052e16; border-color:#166534; }
        [data-theme="dark"] .cd-promote-ready-banner > div { color:#4ade80; }
        [data-theme="dark"] .cd-tip-banner { background:#1e3a5f; border-color:#1d4ed8; }
        [data-theme="dark"] .cd-tip-banner > div { color:#93c5fd; }

        /* ── Modal overlay ── */
        .cd-overlay { position:fixed; inset:0; background:rgba(15,23,42,.72); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:2000; padding:1rem; }

        /* ── Modal ── */
        .cd-modal { background:#fff; border-radius:18px; width:100%; max-width:640px; max-height:92vh; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 32px 80px rgba(0,0,0,.28); animation:cdSlideIn .2s ease; }
        @keyframes cdSlideIn { from{opacity:0;transform:scale(.96) translateY(-10px)} to{opacity:1;transform:none} }
        [data-theme="dark"] .cd-modal { background:#1e293b; }

        /* Modal header */
        .cd-modal-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; padding:1.35rem 1.5rem; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
        [data-theme="dark"] .cd-modal-hdr { border-color:#334155; }
        .cd-modal-hdr-left { display:flex; align-items:flex-start; gap:.85rem; }
        .cd-modal-icon { width:40px; height:40px; border-radius:10px; background:#ccfbf1; color:#0d9488; display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .cd-modal-hdr h3 { margin:0 0 .18rem; font-size:.97rem; font-weight:700; color:#111827; }
        [data-theme="dark"] .cd-modal-hdr h3 { color:#f1f5f9; }
        .cd-modal-hdr p  { margin:0; font-size:.78rem; color:#6b7280; line-height:1.4; }
        .cd-x-btn { display:flex; align-items:center; justify-content:center; width:29px; height:29px; border-radius:8px; border:1px solid #e5e7eb; background:transparent; color:#6b7280; cursor:pointer; font-size:.9rem; flex-shrink:0; }
        .cd-x-btn:hover { background:#f3f4f6; }

        /* Context bar */
        .cd-context-bar { display:flex; align-items:center; gap:.6rem; padding:.65rem 1.5rem; background:#f8fafc; border-bottom:1px solid #f1f5f9; flex-shrink:0; flex-wrap:wrap; }
        [data-theme="dark"] .cd-context-bar { background:#0f172a; border-color:#334155; }
        .cd-context-item { display:flex; flex-direction:column; }
        .cd-context-label { font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; }
        .cd-context-val { font-size:.82rem; font-weight:600; color:#111827; }
        [data-theme="dark"] .cd-context-val { color:#f1f5f9; }
        .cd-context-val--teal { color:#0d9488; }
        .cd-context-arrow { color:#d1d5db; font-size:.95rem; flex-shrink:0; }
        .cd-context-sep { width:1px; height:28px; background:#e5e7eb; margin:0 .2rem; }
        [data-theme="dark"] .cd-context-sep { background:#334155; }

        /* Result banner */
        .cd-result-banner { display:flex; align-items:flex-start; gap:.7rem; padding:.85rem 1.5rem; font-size:.83rem; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
        .cd-result-banner.success { background:#f0fdf4; color:#15803d; }
        .cd-result-banner.error   { background:#fef2f2; color:#b91c1c; }
        .cd-result-banner svg { font-size:1.1rem; flex-shrink:0; margin-top:1px; }
        .cd-result-text { flex:1; }
        .cd-result-warn { color:#d97706; }
        .cd-result-done { padding:.35rem .85rem; background:#0d9488; color:#fff; border:none; border-radius:7px; font-size:.78rem; cursor:pointer; white-space:nowrap; }

        /* Modal body */
        .cd-modal-body { padding:1.25rem 1.5rem; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:1rem; }

        /* Info note */
        .cd-note { display:flex; align-items:flex-start; gap:.55rem; padding:.7rem .95rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; font-size:.79rem; color:#1d4ed8; line-height:1.5; }
        .cd-note svg { font-size:.95rem; flex-shrink:0; margin-top:1px; }

        /* Config row */
        .cd-config-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        @media(max-width:480px) { .cd-config-row { grid-template-columns:1fr; } }
        .cd-field { display:flex; flex-direction:column; gap:.35rem; }
        .cd-label { font-size:.78rem; font-weight:600; color:#374151; }
        [data-theme="dark"] .cd-label { color:#d1d5db; }
        .cd-req { color:#ef4444; }

        /* Suggested shortcut */
        .cd-suggested { display:flex; align-items:center; gap:.4rem; font-size:.75rem; color:#6b7280; }
        .cd-suggested-star { color:#f59e0b; font-size:.85rem; flex-shrink:0; }
        .cd-suggested-btn { display:inline-flex; align-items:center; gap:.3rem; padding:2px 9px; border-radius:6px; border:1px solid #d1d5db; background:#fff; color:#374151; font-size:.75rem; font-weight:600; cursor:pointer; transition:all .12s; }
        .cd-suggested-btn:hover { border-color:#0d9488; color:#0d9488; }
        .cd-suggested-btn.active { background:#0d9488; color:#fff; border-color:#0d9488; }
        .cd-suggested-btn svg { font-size:.8rem; }
        [data-theme="dark"] .cd-suggested-btn { background:#0f172a; border-color:#475569; color:#d1d5db; }

        /* Select */
        .cd-select-wrap { position:relative; }
        .cd-select-wrap select { width:100%; padding:.55rem .85rem; padding-right:2.2rem; border:1px solid #d1d5db; border-radius:8px; font-size:.85rem; color:#111827; background:#fff; appearance:none; cursor:pointer; transition:border-color .14s, box-shadow .14s; }
        .cd-select-wrap select:focus { outline:none; border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.12); }
        .cd-select-chevron { position:absolute; right:.7rem; top:50%; transform:translateY(-50%); color:#9ca3af; pointer-events:none; font-size:.9rem; }
        [data-theme="dark"] .cd-select-wrap select { background:#0f172a; border-color:#475569; color:#f1f5f9; }

        /* Input */
        .cd-input { padding:.55rem .85rem; border:1px solid #d1d5db; border-radius:8px; font-size:.85rem; color:#111827; background:#fff; transition:border-color .14s, box-shadow .14s; }
        .cd-input:focus { outline:none; border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.12); }
        [data-theme="dark"] .cd-input { background:#0f172a; border-color:#475569; color:#f1f5f9; }
        .cd-hint { font-size:.72rem; color:#6b7280; }

        /* Student selector */
        .cd-selector { border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
        [data-theme="dark"] .cd-selector { border-color:#334155; }
        .cd-selector-hdr { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:.7rem 1rem; background:#f9fafb; border-bottom:1px solid #e5e7eb; flex-wrap:wrap; }
        [data-theme="dark"] .cd-selector-hdr { background:#0f172a; border-color:#334155; }
        .cd-selector-title { display:flex; align-items:center; gap:.4rem; font-size:.82rem; font-weight:600; color:#374151; }
        [data-theme="dark"] .cd-selector-title { color:#d1d5db; }
        .cd-selector-title svg { color:#6b7280; }
        .cd-selector-ctrl { display:flex; align-items:center; gap:.65rem; }
        .cd-sel-count { font-size:.74rem; color:#6b7280; }
        .cd-sel-toggle { font-size:.74rem; color:#0d9488; background:none; border:none; cursor:pointer; font-weight:600; padding:0; }
        .cd-sel-toggle:hover { text-decoration:underline; }

        /* Filter row */
        .cd-filter-row { position:relative; padding:.55rem .75rem; border-bottom:1px solid #f1f5f9; }
        [data-theme="dark"] .cd-filter-row { border-color:#334155; }
        .cd-filter-icon { position:absolute; left:1.2rem; top:50%; transform:translateY(-50%); color:#9ca3af; font-size:.85rem; pointer-events:none; }
        .cd-filter-input { width:100%; padding:.38rem .75rem .38rem 2rem; border:1px solid #e5e7eb; border-radius:7px; font-size:.81rem; color:#111827; background:#fff; box-sizing:border-box; }
        .cd-filter-input:focus { outline:none; border-color:#0d9488; }
        [data-theme="dark"] .cd-filter-input { background:#0f172a; border-color:#475569; color:#f1f5f9; }

        /* Student rows */
        .cd-student-list { max-height:230px; overflow-y:auto; scrollbar-width:thin; }
        .cd-student-row { display:flex; align-items:center; gap:.7rem; padding:.58rem 1rem; cursor:pointer; border-bottom:1px solid #fafafa; transition:background .1s; }
        [data-theme="dark"] .cd-student-row { border-color:#1e293b; }
        .cd-student-row:last-child { border-bottom:none; }
        .cd-student-row:hover { background:#f9fafb; }
        [data-theme="dark"] .cd-student-row:hover { background:#334155; }
        .cd-student-row.checked { background:#f0fdfa; }
        [data-theme="dark"] .cd-student-row.checked { background:rgba(13,148,136,.1); }
        .cd-checkbox { width:15px; height:15px; accent-color:#0d9488; cursor:pointer; flex-shrink:0; }
        .cd-avatar { width:30px; height:30px; border-radius:8px; background:#e0e7ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; flex-shrink:0; }
        .cd-avatar--teal { background:#ccfbf1; color:#0d9488; }
        .cd-s-info { flex:1; display:flex; flex-direction:column; min-width:0; }
        .cd-s-name { font-size:.82rem; font-weight:600; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        [data-theme="dark"] .cd-s-name { color:#f1f5f9; }
        .cd-s-meta { font-size:.7rem; color:#6b7280; }
        .cd-s-check { color:#0d9488; font-size:.9rem; flex-shrink:0; }
        .cd-empty { text-align:center; padding:1.5rem; font-size:.82rem; color:#9ca3af; margin:0; }

        /* Excluded note */
        .cd-excluded-note { display:flex; align-items:center; gap:.4rem; padding:.55rem 1rem; background:#fffbeb; border-top:1px solid #fde68a; font-size:.76rem; color:#92400e; }
        .cd-excluded-note svg { font-size:.9rem; flex-shrink:0; }
        [data-theme="dark"] .cd-excluded-note { background:#422006; border-color:#713f12; color:#fbbf24; }

        /* Modal footer */
        .cd-modal-footer { display:flex; align-items:center; justify-content:flex-end; gap:.6rem; padding:.95rem 1.5rem; border-top:1px solid #f1f5f9; flex-shrink:0; }
        [data-theme="dark"] .cd-modal-footer { border-color:#334155; }
        .cd-btn-ghost { padding:.52rem 1.1rem; background:transparent; border:1px solid #d1d5db; color:#374151; border-radius:9px; font-size:.875rem; cursor:pointer; transition:background .14s; }
        .cd-btn-ghost:hover { background:#f3f4f6; }
        .cd-btn-ghost:disabled { opacity:.45; cursor:not-allowed; }
        [data-theme="dark"] .cd-btn-ghost { border-color:#475569; color:#d1d5db; }
        [data-theme="dark"] .cd-btn-ghost:hover { background:#334155; }
        .cd-btn-primary { display:inline-flex; align-items:center; gap:.4rem; padding:.52rem 1.2rem; background:#0d9488; color:#fff; border:none; border-radius:9px; font-size:.875rem; font-weight:600; cursor:pointer; transition:background .14s; }
        .cd-btn-primary:hover { background:#0f766e; }
        .cd-btn-primary:disabled { opacity:.42; cursor:not-allowed; }
        .cd-btn-confirm { display:inline-flex; align-items:center; gap:.4rem; padding:.52rem 1.2rem; background:#16a34a; color:#fff; border:none; border-radius:9px; font-size:.875rem; font-weight:600; cursor:pointer; transition:background .14s; }
        .cd-btn-confirm:hover { background:#15803d; }
        .cd-btn-confirm:disabled { opacity:.42; cursor:not-allowed; }
        .cd-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:cdSpin .65s linear infinite; }
        @keyframes cdSpin { to{transform:rotate(360deg)} }

        /* ── Confirm step ── */
        .cd-confirm-body { align-items:center; text-align:center; gap:.85rem; }
        .cd-confirm-icon-wrap { width:52px; height:52px; border-radius:50%; background:#ccfbf1; color:#0d9488; display:flex; align-items:center; justify-content:center; font-size:1.5rem; }
        .cd-confirm-title    { margin:0; font-size:1rem; font-weight:700; color:#111827; }
        [data-theme="dark"] .cd-confirm-title { color:#f1f5f9; }
        .cd-confirm-subtitle { margin:0; font-size:.85rem; color:#374151; line-height:1.5; }
        [data-theme="dark"] .cd-confirm-subtitle { color:#d1d5db; }

        .cd-confirm-table { width:100%; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; text-align:left; }
        [data-theme="dark"] .cd-confirm-table { border-color:#334155; }
        .cd-confirm-row { display:flex; justify-content:space-between; align-items:center; padding:.6rem 1rem; border-bottom:1px solid #f1f5f9; font-size:.82rem; }
        [data-theme="dark"] .cd-confirm-row { border-color:#1e293b; }
        .cd-confirm-row:last-child { border-bottom:none; }
        .cd-confirm-row span { color:#6b7280; }
        [data-theme="dark"] .cd-confirm-row span { color:#94a3b8; }
        .cd-confirm-row strong { color:#111827; }
        [data-theme="dark"] .cd-confirm-row strong { color:#f1f5f9; }

        .cd-confirm-students { width:100%; text-align:left; }
        .cd-confirm-students-title { font-size:.75rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; margin:0 0 .5rem; }
        .cd-confirm-student-chips { display:flex; flex-wrap:wrap; gap:.35rem; max-height:100px; overflow-y:auto; }
        .cd-name-chip { display:inline-block; padding:3px 9px; background:#f1f5f9; border-radius:99px; font-size:.74rem; color:#374151; }
        [data-theme="dark"] .cd-name-chip { background:#334155; color:#d1d5db; }

        .cd-warning-box { display:flex; align-items:flex-start; gap:.5rem; padding:.75rem 1rem; background:#fffbeb; border:1px solid #fde68a; border-radius:9px; font-size:.77rem; color:#92400e; line-height:1.5; text-align:left; width:100%; box-sizing:border-box; }
        .cd-warning-box svg { flex-shrink:0; margin-top:1px; }
        .cd-warning-box code { background:#fef9c3; padding:1px 5px; border-radius:4px; font-family:monospace; font-size:.75rem; }
        [data-theme="dark"] .cd-warning-box { background:#422006; border-color:#713f12; color:#fbbf24; }
        [data-theme="dark"] .cd-warning-box code { background:#713f12; }
      `}</style>
    </div>
  );
}
