import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import FloatingShape from "./FloatingShape";
import ParticleField from "./ParticleField";

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#ff8a3d" />
      <pointLight position={[-5, -3, -3]} intensity={0.9} color="#8354d1" />
      <Suspense fallback={null}>
        <ParticleField count={220} radius={7} size={0.035} speed={0.03} />
        <FloatingShape position={[2.2, 0.5, -1]} scale={1.5} color="#f76b1c" speed={0.7} wireframe />
      </Suspense>
    </Canvas>
  );
}
