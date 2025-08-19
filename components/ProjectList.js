import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import SceneSlider from "./SceneSlider";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projectData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4">
      {projects.length === 0 ? (
        <p className="text-white">Nenhum projeto encontrado.</p>
      ) : (
        projects.map((project) => (
          <div key={project.id} className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              {project.name}
            </h2>
            <SceneSlider scenes={project.scenes || []} projectId={project.id} />
          </div>
        ))
      )}
    </div>
  );
}
