import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FaUsers, FaUserPlus, FaPaperPlane } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import axiosInstance from '../config/axios';
import { useUser } from '../context/user.context';
import { initialize, sendMessage, receiveMessage } from '../config/socket';
import ReactMarkdown from 'react-markdown';
import {getWebContainer} from '../config/webContainer'
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

const Project = () => {
  const location = useLocation();
  const projectFromState = location.state?.project;
  const { user } = useUser();
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Welcome to the project chat!' },
  ]);
  const [input, setInput] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adding, setAdding] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [aiFileTree, setAiFileTree] = useState(null);
  const [webContainer,setWebContainer] = useState(null)
  const [lsOutput, setLsOutput] = useState('');
  const [isRunningLs, setIsRunningLs] = useState(false);
  const [npmOutput, setNpmOutput] = useState('');
  const [isRunningNpm, setIsRunningNpm] = useState(false);
  const [serverUrl, setServerUrl] = useState(null);
  const [runProcess,setRunProcess] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editingFile, setEditingFile] = useState(null);
  const [iframePath, setIframePath] = useState('/');

  // Get project from state or sessionStorage
  const [project, setProject] = useState(() => {
    if (projectFromState) {
      // Store in sessionStorage for persistence across refreshes
      sessionStorage.setItem('currentProject', JSON.stringify(projectFromState));
      return projectFromState;
    }
    // Try to get from sessionStorage on refresh
    const storedProject = sessionStorage.getItem('currentProject');
    return storedProject ? JSON.parse(storedProject) : null;
  });

  // Hardcoded file tree (express style)
  const fileTree = [
    {
      name: 'app.js',
      type: 'file',
      content: `const express = require('express');\nconst app = express();\n// ...more code...\nmodule.exports = app;`
    },
    {
      name: 'routes',
      type: 'folder',
      children: [
        {
          name: 'index.js',
          type: 'file',
          content: `const express = require('express');\nconst router = express.Router();\n// ...routes...\nmodule.exports = router;`
        }
      ]
    },
    {
      name: 'controllers',
      type: 'folder',
      children: [
        {
          name: 'userController.js',
          type: 'file',
          content: `exports.getUser = (req, res) => {\n  // ...controller logic...\n};`
        }
      ]
    }
  ];

  // Helper to render file tree
  const FileTree = ({ tree, onFileClick, level = 0 }) => (
    <ul className={`pl-${level * 4}`}> {/* Indent folders */}
      {tree.map((node, idx) => (
        <li key={idx} className="mb-1">
          {node.type === 'file' ? (
            <button
              className="text-left w-full hover:bg-gray-600 rounded px-2 py-1 font-mono text-sm"
              onClick={() => onFileClick(node)}
            >
              📄 {node.name}
            </button>
          ) : (
            <div>
              <div className="font-bold text-pink-300">📁 {node.name}</div>
              <FileTree tree={node.children} onFileClick={onFileClick} level={level + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  // Helper to convert AI file tree object to array
  function fileTreeObjectToArray(obj) {
    if (!obj) return [];
    return Object.entries(obj).map(([name, value]) => {
      if (value.type === 'file') {
        return { name, type: 'file', content: value.contents };
      } else if (value.type === 'folder') {
        return { name, type: 'folder', children: fileTreeObjectToArray(value.children) };
      }
      return null;
    }).filter(Boolean);
  }

  // Helper to flatten file tree for WebContainer
  function flattenFileTree(fileTreeObj) {
    console.log('Flattening file tree:', fileTreeObj);
    const flatFiles = {};
    
    function traverse(obj, currentPath = '') {
      Object.entries(obj).forEach(([name, value]) => {
        if (value.type === 'file') {
          // For files, use just the filename
          flatFiles[name] = { 
            file: { 
              contents: value.contents 
            } 
          };
          console.log(`Added file: ${name}`);
        } else if (value.type === 'folder' && value.children) {
          // For folders, create directory
          flatFiles[name] = { 
            directory: {} 
          };
          console.log(`Created directory: ${name}`);
          
          // Process children and add them to the same level
          Object.entries(value.children).forEach(([childName, childValue]) => {
            if (childValue.type === 'file') {
              flatFiles[childName] = { 
                file: { 
                  contents: childValue.contents 
                } 
              };
              console.log(`Added child file: ${childName}`);
            } else if (childValue.type === 'folder') {
              flatFiles[childName] = { 
                directory: {} 
              };
              console.log(`Created child directory: ${childName}`);
            }
          });
        }
      });
    }
    
    traverse(fileTreeObj);
    console.log('Final flattened files:', flatFiles);
    return flatFiles;
  }

  useEffect(() => {
    if (showAddModal) {
      setLoadingUsers(true);
      axiosInstance.get('/user/all')
        .then(res => {
          console.log(res.data)
          setAllUsers(res.data || []);
        })
        .catch(() => setAllUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [showAddModal]);

  // Fetch collaborators when the sliding panel is opened
  useEffect(() => {
    if (showUsers && project && project._id) {
      setLoadingCollaborators(true);
      axiosInstance.get(`/project/get-project/${project._id}`)
        .then(res => {
          console.log('Project details response:', res.data);
          setCollaborators(res.data.users || []);
        })
        .catch(() => setCollaborators([]))
        .finally(() => setLoadingCollaborators(false));
    }
  }, [showUsers, project]);

  // Initialize socket connection
  useEffect(() => {
    if (project && project._id) {
      initialize(project._id);
    }
  }, [project]);

  //for web container
  useEffect(() => {
    if (!webContainer) {
      console.log('Initializing WebContainer...');
      getWebContainer()
        .then(container => {
          console.log('✅ WebContainer initialized successfully!');
          setWebContainer(container);
          console.log('✅ WebContainer set successfully!');
        })
        .catch(error => {
          console.error('❌ Failed to initialize WebContainer:', error);
        });
    }
  }, [webContainer]);

  // Listen for incoming messages
  useEffect(() => {
    const cleanup = receiveMessage('project-message', (data) => {
      console.log('Received message:', data);
      const isAI = data.email === 'AI' || data.from === 'ai';
      setMessages(prev => [...prev, {
        from: isAI ? 'ai' : 'other',
        text: data.text,
        email: data.email
      }]);
      // Accept both filetree and fileTree
      const filetree = data.filetree || data.fileTree;
      if (filetree) {
        console.log('Raw filetree data:', filetree);
        console.log('Type of filetree:', typeof filetree);
        try {
          const tree = typeof filetree === 'string' ? JSON.parse(filetree) : filetree;
          console.log('Parsed tree:', tree);
          setAiFileTree(tree);
          console.log('Set AI file tree:', tree);
          
          // Mount to WebContainer if available
          if (webContainer) {
            const flatFiles = flattenFileTree(tree);
            console.log(flatFiles);
            webContainer.mount(flatFiles)
              .then(() => {
                console.log('Successfully mounted files to WebContainer');
              })
              .catch(error => {
                console.error('Failed to mount files to WebContainer:', error);
              });
          } else {
            console.log('WebContainer not initialized yet. Files will be mounted when WebContainer is ready.');
          }
        } catch (e) {
          console.error('Failed to parse filetree:', filetree, e);
          console.error('Error details:', e.message);
        }
      }
    });

    return cleanup;
  }, [webContainer]);

  // Reset selectedFile when aiFileTree changes
  useEffect(() => {
    setSelectedFile(null);
  }, [aiFileTree]);

  // Add this effect after webContainer is set
  useEffect(() => {
    if (webContainer) {
      webContainer.on('server-ready', (port, url) => {
        setServerUrl(url);
      });
    }
  }, [webContainer]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    console.log('Sending message:', input);
    
    // Add message to local state
    setMessages(prev => [...prev, { 
      from: 'user', 
      text: input,
      email: user?.email 
    }]);
    
    // Send message via socket
    sendMessage('project-message', { 
      text: input,
      sender: user?._id,
      email: user?.email
    });
    
    setInput('');
  };

  const handleSelectUser = (email) => {
    setSelectedUsers((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const handleAddCollaborators = async () => {
    if (!project || !project._id || selectedUsers.length === 0) return;
    setAdding(true);
    try {
      // Find user IDs for selected emails
      const userIds = allUsers
        .filter(u => selectedUsers.includes(u.email))
        .map(u => u._id);
      await axiosInstance.put('/project/add-user', {
        projectId: project._id,
        users: userIds,
      });
      setShowAddModal(false);
      setSelectedUsers([]);
    } catch (err) {
      // Optionally handle error (e.g., show a message)
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  // Function to run ls command
  const runLsCommand = async () => {
    if (!webContainer) {
      console.log('WebContainer not available');
      return;
    }
    
    setIsRunningLs(true);
    try {
      // Use WebContainer's file system API instead of spawn
      const files = await webContainer.fs.readdir('/');
      console.log('Files in root:', files);
      
      // Format the output nicely
      const fileList = files.map(file => `- ${file}`).join('\n');
      setLsOutput(`Files in WebContainer:\n${fileList}`);
      
    } catch (error) {
      console.error('Failed to read directory:', error);
      setLsOutput(`Error reading directory: ${error.message}`);
    } finally {
      setIsRunningLs(false);
    }
  };

  // Function to run npm install
  const runNpmInstall = async () => {
    if (!webContainer) {
      console.log('WebContainer not available');
      return;
    }
  
    setIsRunningNpm(true);
    setNpmOutput('Installing dependencies...\n');
  
    try {
      const process = await webContainer.spawn('npm', ['install']);
  
      process.output.pipeTo(new WritableStream({
        write(chunk) {
          let text;
          if (chunk instanceof Uint8Array) {
            text = new TextDecoder().decode(chunk);
          } else if (typeof chunk === 'string') {
            text = chunk;
          } else {
            text = String(chunk);
          }
          text = stripAnsi(text);
          setNpmOutput((prev) => prev + text);
        }
      }));
  
      const exitCode = await process.exit;
      if (exitCode === 0) {
        setNpmOutput((prev) => prev + '\nDependencies installed successfully!');
      } else {
        setNpmOutput((prev) => prev + `\nInstallation failed (code ${exitCode})`);
      }
    } catch (error) {
      setNpmOutput(`Error: ${error.message}`);
      console.error('Failed to run npm install:', error);
    } finally {
      setIsRunningNpm(false);
    }
  };
  

  // Function to run npm start
  const runNpmStart = async () => {
    if (!webContainer) {
      console.log('WebContainer not available');
      return;
    }
  
    setIsRunningNpm(true);
    setNpmOutput('Starting application...\n');
  
    try {
      if (runProcess) {
        try {
          await runProcess.kill();
          setRunProcess(null);
        } catch (err) {
          console.warn('Failed to kill previous process:', err);
        }
      }
      const process = await webContainer.spawn('npm', ['start']);
      setRunProcess(process);
      let fullOutput = '';
  
      process.output.pipeTo(new WritableStream({
        write(chunk) {
          let text;
          if (chunk instanceof Uint8Array) {
            text = new TextDecoder().decode(chunk);
          } else if (typeof chunk === 'string') {
            text = chunk;
          } else {
            text = String(chunk);
          }
          text = stripAnsi(text);
          fullOutput += text;
          console.log(text);
          setNpmOutput((prev) => prev + text);
        }
      }));
      const exitCode = await process.exit;
      setRunProcess(null);
  
      if (exitCode === 0) {
        setNpmOutput((prev) => prev + `\nApplication started successfully!\n`);
        console.log('NPM start output:', fullOutput);
      } else {
        setNpmOutput((prev) => prev + `\nFailed to start (exit code ${exitCode})\n`);
        console.error('NPM start error:', fullOutput);
      }
    } catch (error) {
      setNpmOutput(`Error: ${error.message}`);
      console.error('Failed to run npm start:', error);
    } finally {
      setIsRunningNpm(false);
    }
  };
  

  // Update file click handler to support editing
  const handleFileClick = async (file) => {
    setSelectedFile(file);
    setEditingFile(file.name); // If you have full path, use it here
    setEditContent(file.content);
  };

  // Helper to recursively add files/folders to zip
  async function addFilesToZip(zip, nodes, path = '') {
    for (const node of nodes) {
      if (node.type === 'file') {
        zip.file(path + node.name, node.content || '');
      } else if (node.type === 'folder' && node.children) {
        const folder = zip.folder(path + node.name + '/');
        await addFilesToZip(folder, node.children, '');
      }
    }
  }

  // Handler to download project as zip
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const tree = aiFileTree ? fileTreeObjectToArray(aiFileTree) : fileTree;
    await addFilesToZip(zip, tree);
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, (project?.name || 'project') + '.zip');
  };

  if (!project) {
    return <div className="text-red-400 p-8">No project data found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#1A1B26] text-[#F4F4F9] flex">
      {/* Command Buttons - top right of the screen */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 drop-shadow-lg">
        <button
          onClick={runNpmInstall}
          disabled={!webContainer || isRunningNpm}
          className="bg-gradient-to-r from-[#7F5AF0] to-[#00B4D8] hover:from-[#5A3FC0] hover:to-[#0096C7] disabled:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200"
          title="Install dependencies"
        >
          {isRunningNpm ? 'Installing...' : 'NPM I'}
        </button>
        <button
          onClick={runNpmStart}
          disabled={!webContainer || isRunningNpm}
          className="bg-gradient-to-r from-[#00B4D8] to-[#7F5AF0] hover:from-[#0096C7] hover:to-[#5A3FC0] disabled:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200"
          title="Start application"
        >
          {isRunningNpm ? 'Starting...' : 'START'}
        </button>
      </div>
      {/* Add Collaborators Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#23263A] rounded-2xl shadow-2xl w-full max-w-md p-8 relative border-2 border-[#7F5AF0]">
            <button className="absolute top-3 right-3 text-[#A0AEC0] hover:text-[#FFD803] transition-colors" onClick={() => setShowAddModal(false)}>
              <IoMdClose className="h-7 w-7" />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center text-[#7F5AF0]">Select Users to Add</h2>
            <div className="max-h-60 overflow-y-auto mb-6 scrollbar-hide bg-[#181A20] rounded-lg p-3 border border-[#2D314D]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {loadingUsers ? (
                <div className="text-[#A0AEC0] text-center py-4">Loading users...</div>
              ) : (
                <ul className="space-y-3">
                  {allUsers.length > 0 ? allUsers.map((user, idx) => (
                    <li key={idx} className="flex items-center gap-3 bg-[#23263A] rounded-lg px-3 py-2 border border-[#2D314D]">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.email)}
                        onChange={() => handleSelectUser(user.email)}
                        id={`user-email-${idx}`}
                        className="accent-[#7F5AF0] w-4 h-4 rounded focus:ring-2 focus:ring-[#7F5AF0]"
                      />
                      <label htmlFor={`user-email-${idx}`} className="text-[#F4F4F9] font-mono cursor-pointer">{user.email}</label>
                    </li>
                  )) : <li className="text-[#A0AEC0]">No users found.</li>}
                </ul>
              )}
            </div>
            <button
              className="w-full bg-gradient-to-r from-[#7F5AF0] to-[#00B4D8] hover:from-[#5A3FC0] hover:to-[#0096C7] text-white font-semibold py-3 rounded-lg shadow-md transition-all text-lg disabled:opacity-60"
              onClick={handleAddCollaborators}
              disabled={selectedUsers.length === 0 || adding}
            >
              {adding ? 'Adding...' : 'Add Collaborators'}
            </button>
          </div>
        </div>
      )}
      {/* Left: Chat */}
      <div className="w-1/3 flex flex-col bg-[#23263A] border-r border-[#2D314D] relative overflow-x-hidden h-screen shadow-2xl rounded-tr-2xl">
        {/* Sliding Users Panel */}
        <div className={`fixed top-0 left-0 h-full z-30 bg-[#23263A] shadow-2xl transition-transform duration-300 ease-in-out ${showUsers ? 'translate-x-0' : '-translate-x-full'} w-64 border-r-2 border-[#7F5AF0]`}
             style={{ maxWidth: '80vw' }}>
          <div className="flex items-center justify-between p-4 border-b border-[#7F5AF0] bg-[#1A1B26] rounded-tl-2xl">
            <span className="font-bold text-lg text-[#7F5AF0]">Collaborators</span>
            <button onClick={() => setShowUsers(false)}><IoMdClose className="h-6 w-6 text-white hover:text-[#FFD803] transition-colors" /></button>
          </div>
          <div className="p-4">
            {loadingCollaborators ? (
              <div className="text-[#A0AEC0]">Loading collaborators...</div>
            ) : (
              <ul className="space-y-2">
                {collaborators.length > 0 ? collaborators.map((user, idx) => (
                  <li key={idx} className="bg-[#181A20] rounded-lg px-3 py-2 text-[#F4F4F9] shadow-md">{user.email}</li>
                )) : <li className="text-[#A0AEC0]">No users found.</li>}
              </ul>
            )}
          </div>
        </div>
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-[#23263A] to-[#1A1B26] p-4 flex items-center justify-between flex-shrink-0 border-b border-[#2D314D] rounded-tr-2xl">
          <div className="flex items-center justify-between w-full">
            <button onClick={() => setShowUsers(true)}>
              <FaUsers className="h-6 w-6 text-[#7F5AF0] hover:text-[#FFD803] transition-colors" />
            </button>
            <button className="ml-auto" title="Add Collaborator" onClick={() => setShowAddModal(true)}>
              <div className="flex items-center gap-2">
                <FaUserPlus className="h-6 w-6 text-[#FFD803] hover:text-[#7F5AF0] transition-colors" />
                <span className="text-[#FFD803] font-medium text-sm">Add Collaborators</span>
              </div>
            </button>
          </div>
        </div>
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0 scrollbar-hide bg-[#23263A]">
          {messages.map((msg, idx) => {
            const isAI = msg.from === 'ai' || msg.email === 'AI';
            return (
              <div
                key={idx}
                className={`w-80 break-words px-4 py-2 rounded-2xl shadow-md transition-all duration-200
                  ${msg.from === 'user' ? 'bg-gradient-to-r from-[#7F5AF0] to-[#00B4D8] text-white self-end border-2 border-[#7F5AF0]' :
                    msg.from === 'bot' ? 'bg-[#FFD803] text-[#23263A] self-start border-2 border-[#FFD803]' :
                    isAI ? 'bg-gradient-to-r from-[#FFD803] to-[#7F5AF0] text-[#23263A] border-2 border-[#FFD803] self-start' :
                    'bg-[#181A20] text-[#A0AEC0] self-start border border-[#2D314D]'}
                `}
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              >
                {msg.email && (
                  <div className={`text-xs font-semibold mb-1 ${msg.from === 'user' ? 'text-[#FFD803]' : isAI ? 'text-[#7F5AF0]' : 'text-[#A0AEC0]'}`}>
                    {msg.email}
                  </div>
                )}
                {/* Render AI messages as Markdown, others as plain text */}
                {isAI ? (
                  <div className="overflow-x-auto scrollbar-hide" style={{ wordBreak: 'normal', overflowWrap: 'normal' }}>
                    <ReactMarkdown>
                      {msg.text || ''}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            );
          })}
        </div>
        {/* Chat Input */}
        <form onSubmit={handleSend} className="p-3 bg-[#181A20] flex gap-2 flex-shrink-0 border-t border-[#2D314D] rounded-b-2xl shadow-inner">
          <input
            className="flex-1 rounded-lg px-3 py-2 text-[#23263A] bg-[#F4F4F9] focus:outline-none focus:ring-2 focus:ring-[#7F5AF0] font-mono"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-[#7F5AF0] to-[#00B4D8] rounded-lg px-4 py-2 font-semibold hover:from-[#5A3FC0] hover:to-[#0096C7] text-white flex items-center justify-center shadow-md transition-all"
            title="Send"
          >
            <FaPaperPlane className="h-5 w-5" />
          </button>
        </form>
      </div>
      {/* Right: File Tree & File Content (side by side) */}
      <div className="w-3/5 flex flex-row items-start justify-start p-8 gap-6">
        {/* File Tree Sidebar */}
        <div className="bg-[#23263A] rounded-2xl shadow-2xl p-4 max-w-xs w-56 h-[600px] overflow-y-auto scrollbar-hide relative border border-[#2D314D]">
          <h2 className="text-xl font-bold mb-4 text-center text-[#7F5AF0]">Project Files</h2>
          <button
            className="mb-4 w-full bg-gradient-to-r from-[#7F5AF0] to-[#00B4D8] hover:from-[#5A3FC0] hover:to-[#0096C7] text-white font-semibold py-2 rounded-lg shadow-md transition-all text-sm"
            onClick={handleDownloadZip}
            title="Download project as ZIP"
          >
            Download ZIP
          </button>
          <FileTree tree={aiFileTree ? fileTreeObjectToArray(aiFileTree) : fileTree} onFileClick={handleFileClick} />
        </div>
        {/* File Content */}
        <div className="flex-1 h-[600px] overflow-y-auto scrollbar-hide relative">
          {lsOutput ? (
            <div className="bg-[#181A20] rounded-2xl shadow-2xl p-4 w-full max-w-2xl overflow-x-auto scrollbar-hide border border-[#2D314D]">
              <div className="mb-2 font-semibold text-blue-200 flex justify-between items-center">
                <span>LS Output</span>
                <button
                  onClick={() => setLsOutput('')}
                  className="text-[#7F5AF0] hover:text-[#FFD803] text-sm"
                >
                  ✕
                </button>
              </div>
              <pre className="text-sm text-[#A0AEC0] whitespace-pre-wrap font-mono">{lsOutput}</pre>
            </div>
          ) : npmOutput ? (
            <div className="bg-[#181A20] rounded-2xl shadow-2xl p-4 w-full max-w-2xl overflow-x-auto scrollbar-hide border border-[#2D314D]">
              <div className="mb-2 font-semibold text-green-200 flex justify-between items-center">
                <span>NPM Output</span>
                <button
                  onClick={() => {
                    setNpmOutput('');
                    setIsRunningNpm(false);
                  }}
                  className="text-[#7F5AF0] hover:text-[#FFD803] text-sm"
                >
                  ✕
                </button>
              </div>
              <pre className="text-sm text-[#A0AEC0] whitespace-pre-wrap font-mono">{npmOutput}</pre>
            </div>
          ) : selectedFile ? (
            <div className="bg-[#181A20] rounded-2xl shadow-2xl p-4 w-full max-w-2xl overflow-x-auto scrollbar-hide border border-[#2D314D]">
              <div className="mb-2 font-semibold text-[#FFD803]">{selectedFile.name}</div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                style={{
                  width: '100%',
                  height: 400,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#F4F4F9',
                  background: '#23263A',
                  borderRadius: 12,
                  padding: 12,
                  border: '1.5px solid #7F5AF0',
                  resize: 'none',
                  overflow: 'auto',
                  fontSize: 15,
                  scrollbarWidth: 'none', // Firefox
                  msOverflowStyle: 'none', // IE/Edge
                }}
                className="scrollbar-hide focus:outline-none"
              />
              <button
                className="mt-2 bg-gradient-to-r from-[#7F5AF0] to-[#00B4D8] hover:from-[#5A3FC0] hover:to-[#0096C7] text-white px-6 py-2 rounded-lg font-semibold shadow-md transition-all"
                onClick={async () => {
                  if (webContainer && editingFile) {
                    await webContainer.fs.writeFile(editingFile, editContent);
                    alert('File saved!');
                  }
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <div className="text-[#A0AEC0] p-8">Select a file to view its contents or use the buttons to run commands.</div>
          )}
        </div>
      </div>
      {serverUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            flexDirection: 'column',
          }}
        >
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={iframePath}
              onChange={e => setIframePath(e.target.value)}
              placeholder="Enter route, e.g. /api/hello"
              style={{ padding: 6, borderRadius: 4, border: '1px solid #333', minWidth: 200, background: '#111', color: '#bbb', outline: 'none' }}
            />
            <button
              onClick={() => setIframePath(iframePath)}
              style={{ padding: '6px 16px', borderRadius: 4, background: '#111', color: '#bbb', border: '1px solid #333', marginLeft: 4, outline: 'none' }}
            >
              Go
            </button>
            <button
              onClick={() => setIframePath('/')} 
              style={{ padding: '6px 12px', borderRadius: 4, background: '#111', color: '#bbb', border: '1px solid #333', marginLeft: 4, outline: 'none' }}
            >
              Home
            </button>
          </div>
          <iframe
            src={serverUrl + iframePath}
            title="App Preview"
            style={{
              width: '80vw',
              height: '80vh',
              border: '2px solid #fff',
              borderRadius: '12px',
              boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
              background: '#222',
            }}
            onLoad={e => {
              try {
                const iframeDoc = e.target.contentDocument || e.target.contentWindow.document;
                const style = iframeDoc.createElement('style');
                style.innerHTML = `
                  html, body {
                    background: #fff !important;
                    color: #111 !important;
                  }
                  * { color: #111 !important; }
                `;
                iframeDoc.head.appendChild(style);
              } catch (err) {
                // Cross-origin iframes can't be styled this way
              }
            }}
          />
          <button
            onClick={() => setServerUrl(null)}
            style={{
              position: 'absolute',
              top: 32,
              right: 48,
              background: '#fff',
              color: '#222',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              fontSize: 24,
              cursor: 'pointer',
              zIndex: 10000,
            }}
            title="Close Preview"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Project;

<style>
  {`
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `}
</style>