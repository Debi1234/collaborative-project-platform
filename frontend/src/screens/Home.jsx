import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '../context/user.context';
import axiosInstance from '../config/axios';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useContext(UserContext);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all projects for the user on mount
    axiosInstance.get('/project/all')
      .then((response) => {
        setProjects(response.data);
      })
      .catch((error) => {
        console.error('Error fetching projects:', error);
      });
  }, []);

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setProjectName('');
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    axiosInstance.post('/project/create', { name: projectName })
        .then((response) => {
            console.log('Project created:', response.data);
            // Refresh the project list after creating a new project
            setProjects(prev => [...prev, response.data]);
        })
        .catch((error) => {
            console.error('Error creating project:', error);
        });
    handleCloseModal();
  };

  const handleProjectClick = (project) => {
    navigate('/project', { state: { project } });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      <button
        className="absolute top-6 left-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
        onClick={handleOpenModal}
      >
        + New Project
      </button>

      {/* Project List */}
      <div className="pt-24 px-6">
        <h3 className="text-xl font-semibold mb-4">Your Projects</h3>
        {projects.length === 0 ? (
          <div className="text-gray-400">No projects found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {projects.map((project) => (
              <div
                key={project._id}
                className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between min-h-[80px] max-w-xs border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                <div className="text-lg font-semibold mb-2 truncate">{project.name}</div>
                <div className="text-gray-400 text-sm mt-auto flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 10-8 0 4 4 0 008 0zm6 4v2a2 2 0 01-2 2h-1.5M3 16v2a2 2 0 002 2h1.5" /></svg>
                  <span>Collaborators: {project.users ? project.users.length : 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4 text-center">Create New Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-gray-300 mb-1">Project Name</label>
                <input
                  id="projectName"
                  type="text"
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;