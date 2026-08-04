import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";

export default function FloatingShape({
  position = [0, 0, 0],
  scale = 1.6,
  color = "#f76b1c",
  speed = 1,
  distort = 0.45,
  wireframe = false,
}) {
  const ref = useRef(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.12 * speed;
    ref.current.rotation.y += delta * 0.18 * speed;
  });

  return (
    <Float speed={2 * speed} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={ref} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={2}
          roughness={0.15}
          metalness={0.6}
          wireframe={wireframe}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
    </Float>
  );
}
