import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import ParticleField from "./ParticleField";
import FloatingShape from "./FloatingShape";
import useIsMobile from "../hooks/useIsMobile";

export default function IntroScene() {
  const isMobile = useIsMobile();

  return (
    <Canvas
      dpr={isMobile ? [1, 1.3] : [1, 2]}
      camera={{ position: [0, 0, 7.5], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 6, 6]} intensity={1.4} color="#ff8a3d" />
      <pointLight position={[-6, -4, -4]} intensity={1} color="#8354d1" />

      <Suspense fallback={null}>
        <ParticleField count={isMobile ? 300 : 900} radius={8.5} speed={0.05} />
        <FloatingShape
          position={isMobile ? [1.6, 2, -2] : [4.8, 1.8, -2]}
          scale={isMobile ? 0.6 : 0.85}
          color="#f76b1c"
          speed={0.9}
          distort={0.35}
          wireframe
        />
        {!isMobile && (
          <FloatingShape position={[-5, -1.8, -3]} scale={0.55} color="#8354d1" speed={1.4} distort={0.5} wireframe />
        )}
      </Suspense>
    </Canvas>
  );
}
