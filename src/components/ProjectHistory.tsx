import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trash2, 
  ExternalLink, 
  Code, 
  Calendar,
  Search,
  Loader2,
  Layout,
  Share2,
  Globe,
  Lock
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

export default function ProjectHistory({ onBack, onOpenProject, darkMode }: { onBack: () => void, onOpenProject: (project: any) => void, darkMode?: boolean }) {
  const { getProjects, deleteProject, shareProject } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      alert("Failed to delete project.");
    }
  };

  const handleShare = async (id: string, currentStatus: boolean) => {
    try {
      await shareProject(id, !currentStatus);
      setProjects(projects.map(p => p.id === id ? { ...p, isPublic: !currentStatus } : p));
      alert(!currentStatus ? "Project shared with community!" : "Project made private.");
    } catch (error) {
      alert("Failed to update share status.");
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={cn("min-h-screen p-4 sm:p-8 pb-32 lg:pb-8 overflow-y-auto transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Project History</h1>
              <p className="text-zinc-500 text-sm">Manage your AI-generated web projects</p>
            </div>
          </div>

          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-12 pr-4 py-3 rounded-2xl border transition-all outline-none",
                darkMode ? "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500" : "bg-white border-zinc-200 focus:border-indigo-500 shadow-sm"
              )}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
            <p className="text-zinc-500">Loading your projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl border-zinc-200 dark:border-zinc-800">
            <Layout className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No projects found</h3>
            <p className="text-zinc-500 mb-6">Start building something amazing with Fluxion AI!</p>
            <button 
              onClick={onBack}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-all"
            >
              Back to Builder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group border rounded-3xl overflow-hidden transition-all flex flex-col",
                  darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/50" : "bg-white border-zinc-200 hover:border-indigo-500/50 shadow-sm hover:shadow-md"
                )}
              >
                <div className={cn("aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden")}>
                  <Code className="w-12 h-12 text-zinc-300 dark:text-zinc-700 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <button 
                      onClick={() => onOpenProject(project)}
                      className="w-full bg-white text-black font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Project
                    </button>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg line-clamp-1">{project.name}</h3>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleShare(project.id, !!project.isPublic)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          project.isPublic ? "text-emerald-500 hover:bg-emerald-500/10" : "text-zinc-400 hover:bg-zinc-800"
                        )}
                        title={project.isPublic ? "Shared with Community" : "Private Project"}
                      >
                        {project.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleDelete(project.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-zinc-500 text-sm line-clamp-2 mb-4 flex-1">
                    {project.prompt}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(project.createdAt)}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-500">
                      {Object.keys(project.files || {}).length} Files
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
