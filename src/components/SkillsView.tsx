import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";

const Icon = ({ name, className = "", size = 20, style }: { name: string; className?: string; size?: number; style?: React.CSSProperties; }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: `${size}px`, ...style }}>{name}</span>
);

const SkillsView: React.FC = () => {
  const skills = useAppStore((s) => s.skills);
  const createSkill = useAppStore((s) => s.createSkill);
  const updateSkill = useAppStore((s) => s.updateSkill);
  const deleteSkill = useAppStore((s) => s.deleteSkill);
  const setView = useAppStore((s) => s.setView);
  const createSession = useAppStore((s) => s.createSession);
  const selectSession = useAppStore((s) => s.selectSession);

  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const toggleCollapse = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrompt.trim()) return;
    createSkill(newName.trim(), newPrompt.trim());
    setNewName("");
    setNewPrompt("");
    setIsCreating(false);
  };

  const startEdit = (skill: any) => {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditPrompt(skill.systemPrompt);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editPrompt.trim()) return;
    updateSkill(id, editName.trim(), editPrompt.trim());
    setEditingId(null);
  };

  const handleChatWithSkill = (skillId: string) => {
    const sessionId = createSession(skillId);
    selectSession(sessionId);
    setView("chat");
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ width: "100%", maxWidth: "768px", margin: "0 auto", padding: "40px 24px", color: "var(--text-color)" }}>
      {/* Header */}
      <div className="flex items-center" style={{ marginBottom: "32px", gap: "16px" }}>
        <button
          onClick={() => setView("chat")}
          className="flex items-center justify-center rounded-full transition-colors"
          style={{ width: "40px", height: "40px", color: "var(--text-color-muted)", background: "var(--input-bg)", border: "1px solid var(--border-color)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-color)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: "28px", fontWeight: 600, color: "var(--text-color)", margin: 0 }}>
          Skills & Agents
        </h2>
      </div>

      {/* Create Form / Button */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          style={{ marginBottom: "40px", padding: "12px 24px", background: "var(--primary)", color: "white", borderRadius: "8px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Icon name="add" size={20} /> Create New Skill
        </button>
      ) : (
        <form onSubmit={handleCreate} className="flex flex-col gap-4" style={{ marginBottom: "40px", padding: "24px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
          <div className="flex justify-between items-center">
            <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Create New Skill</h3>
            <button type="button" onClick={() => setIsCreating(false)} style={{ color: "var(--text-color-muted)" }} title="Cancel">
              <Icon name="close" size={20} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Skill Name (e.g. Code Reviewer)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", background: "var(--bg-color)", border: "1px solid var(--border-color)", borderRadius: "8px", outline: "none", color: "var(--text-color)" }}
        />
        <textarea
          placeholder="System Prompt / Instructions..."
          rows={4}
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", background: "var(--bg-color)", border: "1px solid var(--border-color)", borderRadius: "8px", outline: "none", resize: "vertical", color: "var(--text-color)" }}
        />
          <button
            type="submit"
            disabled={!newName.trim() || !newPrompt.trim()}
            style={{ alignSelf: "flex-end", padding: "10px 24px", background: "var(--primary)", color: "white", borderRadius: "8px", fontWeight: 600, opacity: (!newName.trim() || !newPrompt.trim()) ? 0.5 : 1 }}
          >
            Save Skill
          </button>
        </form>
      )}

      {/* List */}
      <div className="flex flex-col" style={{ gap: "16px" }}>
        {skills.map((skill) => (
          <div key={skill.id} className="flex flex-col gap-3" style={{ padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
            {editingId === skill.id ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-color)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-color)", outline: "none" }}
                />
                <textarea
                  rows={4}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--bg-color)", border: "1px solid var(--border-color)", borderRadius: "8px", resize: "vertical", color: "var(--text-color)", outline: "none" }}
                />
                <div className="flex justify-end" style={{ gap: "8px" }}>
                  <button onClick={() => setEditingId(null)} style={{ padding: "8px 16px", border: "1px solid var(--border-color)", borderRadius: "6px", color: "var(--text-color)" }}>Cancel</button>
                  <button onClick={() => handleSaveEdit(skill.id)} style={{ padding: "8px 16px", background: "var(--primary)", color: "white", borderRadius: "6px" }}>Save</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: "20px", fontWeight: 600 }}>{skill.name}</div>
                  <div className="flex items-center" style={{ gap: "8px" }}>
                    <button onClick={() => handleChatWithSkill(skill.id)} style={{ padding: "4px 12px", background: "var(--primary)", color: "white", borderRadius: "6px", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><Icon name="chat" size={16} /> Chat</button>
                    <button onClick={() => startEdit(skill)} style={{ color: "var(--text-color-muted)" }}><Icon name="edit" size={18} /></button>
                    <button onClick={() => deleteSkill(skill.id)} style={{ color: "#ba1a1a" }}><Icon name="delete" size={18} /></button>
                    <button onClick={() => toggleCollapse(skill.id)} style={{ color: "var(--text-color-muted)", marginLeft: "4px" }} title={expandedIds.includes(skill.id) ? "Collapse" : "Expand"}>
                      <Icon name={expandedIds.includes(skill.id) ? "expand_less" : "expand_more"} size={22} />
                    </button>
                  </div>
                </div>
                {expandedIds.includes(skill.id) && (
                  <div style={{ fontSize: "14px", color: "var(--text-color-muted)", whiteSpace: "pre-wrap", background: "var(--bg-color)", padding: "12px", borderRadius: "8px" }}>
                    {skill.systemPrompt}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsView;
