import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

const PALETTE = ["#f76b1c", "#ffb073", "#8354d1", "#ac8ce5"];

export default function ParticleField({ count = 800, radius = 9, size = 0.045, speed = 0.02 }) {
  const ref = useRef(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = { r: 0, g: 0, b: 0 };

    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const hex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      color.r = parseInt(hex.slice(1, 3), 16) / 255;
      color.g = parseInt(hex.slice(3, 5), 16) / 255;
      color.b = parseInt(hex.slice(5, 7), 16) / 255;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, [count, radius]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * speed;
    ref.current.rotation.x += delta * speed * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}
