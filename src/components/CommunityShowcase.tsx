import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ExternalLink, 
  Code, 
  Calendar,
  Search,
  Loader2,
  Layout,
  Globe,
  User,
  Sparkles,
  Heart
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

export default function CommunityShowcase({ onBack, onOpenProject, darkMode }: { onBack: () => void, onOpenProject: (project: any) => void, darkMode?: boolean }) {
  const { getSharedProjects } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getSharedProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load community projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.authorName?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Globe className="w-8 h-8 text-indigo-500" />
                Community Showcase
              </h1>
              <p className="text-zinc-500 text-sm">Explore amazing projects built by the Fluxion AI community</p>
            </div>
          </div>

          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search community projects..."
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
            <p className="text-zinc-500">Loading community projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl border-zinc-200 dark:border-zinc-800">
            <Sparkles className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No shared projects yet</h3>
            <p className="text-zinc-500 mb-6">Be the first to share your creation with the world!</p>
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
                      <ExternalLink className="w-4 h-4" /> View & Remix
                    </button>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg line-clamp-1 mb-2">{project.name}</h3>
                  <p className="text-zinc-500 text-sm line-clamp-2 mb-4 flex-1">
                    {project.prompt}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      {project.authorPhoto ? (
                        <img src={project.authorPhoto} alt={project.authorName} className="w-6 h-6 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                          <User className="w-3 h-3 text-zinc-500" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-zinc-400">{project.authorName || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.createdAt)}
                      </div>
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
