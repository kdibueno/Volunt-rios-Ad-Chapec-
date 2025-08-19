import { useState } from "react";
import CameraCard from "./CameraCard";
import SidebarNote from "./SidebarNote";

export default function SceneSlider({ scenes, projectId }) {
  const [selectedCamera, setSelectedCamera] = useState(null);

  return (
    <div className="space-y-6">
      {scenes.map((scene) => (
        <div key={scene.id}>
          <h3 className="text-xl font-semibold text-white mb-2">{scene.title}</h3>
          <div className="flex overflow-x-auto space-x-4 pb-2">
            {scene.cameras.map((camera) => (
              <CameraCard
                key={camera.id}
                title={camera.title}
                description={camera.description}
                onClick={() =>
                  setSelectedCamera({
                    projectId,
                    sceneId: scene.id,
                    cameraId: camera.id
                  })
                }
              />
            ))}
          </div>
        </div>
      ))}

      {selectedCamera && (
        <SidebarNote
          projectId={selectedCamera.projectId}
          sceneId={selectedCamera.sceneId}
          cameraId={selectedCamera.cameraId}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </div>
  );
}
