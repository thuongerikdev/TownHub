"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface ApartmentInfo {
  aptId: string;
  floor: number;
  aptIndex: number;
  buildingCode: string;
}

// occupied=xanh lá, maintenance=cam, vacant=xám, unknown=xanh nhạt (chưa có data)
const STATUS_COLOR: Record<string, { base: number; emissive: number; emissiveIntensity: number }> = {
  occupied:    { base: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.25 },
  maintenance: { base: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.30 },
  vacant:      { base: 0x374151, emissive: 0x1e293b, emissiveIntensity: 0.05 },
  unknown:     { base: 0x1e3a5f, emissive: 0x1e3a5f, emissiveIntensity: 0.08 },
};

interface AptMeshData {
  mesh: THREE.Mesh;
  aptId: string;
  info: ApartmentInfo;
  mat: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  baseEmissive: THREE.Color;
  baseEmissiveIntensity: number;
}

interface Building3DModelProps {
  floors: number;
  apartmentsPerFloor: number;
  buildingCode: string;
  statusMap?: Record<string, string>;
  selectedAptId?: string | null;
  onApartmentClick?: (apt: ApartmentInfo | null) => void;
}

export default function Building3DModel({
  floors,
  apartmentsPerFloor,
  buildingCode,
  statusMap,
  selectedAptId,
  onApartmentClick,
}: Building3DModelProps) {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const containerRef     = useRef<HTMLDivElement>(null);
  const animationIdRef   = useRef<number | undefined>(undefined);
  const aptMeshesRef     = useRef<AptMeshData[]>([]);
  const hoveredRef       = useRef<AptMeshData | null>(null);
  const selectedRef      = useRef<AptMeshData | null>(null);
  const raycaster        = useRef(new THREE.Raycaster());
  const mouse            = useRef(new THREE.Vector2());
  const onClickRef       = useRef(onApartmentClick);
  const statusMapRef     = useRef(statusMap);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => { onClickRef.current = onApartmentClick; }, [onApartmentClick]);

  // Re-color apartments khi statusMap thay đổi (không rebuild scene)
  useEffect(() => {
    statusMapRef.current = statusMap;
    aptMeshesRef.current.forEach((apt) => {
      if (apt === selectedRef.current) return; // giữ màu vàng khi đang chọn
      const sc = STATUS_COLOR[statusMap?.[apt.aptId] ?? "unknown"];
      apt.mat.color.setHex(sc.base);
      apt.baseColor.setHex(sc.base);
      apt.mat.emissive.setHex(sc.emissive);
      apt.baseEmissive.setHex(sc.emissive);
      apt.mat.emissiveIntensity = sc.emissiveIntensity;
      apt.baseEmissiveIntensity = sc.emissiveIntensity;
    });
  }, [statusMap]);

  // Sync external selectedAptId → Three.js material highlight
  useEffect(() => {
    if (selectedRef.current) {
      const prev = selectedRef.current;
      prev.mat.emissive.copy(prev.baseEmissive);
      prev.mat.emissiveIntensity = prev.baseEmissiveIntensity;
      selectedRef.current = null;
    }
    if (selectedAptId) {
      const found = aptMeshesRef.current.find((a) => a.aptId === selectedAptId);
      if (found) {
        found.mat.emissive.setHex(0xffd700);
        found.mat.emissiveIntensity = 0.85;
        selectedRef.current = found;
      }
    }
  }, [selectedAptId]);

  // Main Three.js scene setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    aptMeshesRef.current = [];
    hoveredRef.current   = null;
    selectedRef.current  = null;

    // ── Scene ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1e);
    scene.fog = new THREE.Fog(0x0a0a1e, 10, 100);

    const aptHeight = 1.0;
    const buildingHeight = floors * (aptHeight + 0.3);
    const camDist = Math.max(floors, apartmentsPerFloor) * 1.8 + 8;

    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(camDist, buildingHeight * 0.65, camDist);

    // Dùng canvas đã có trong DOM (JSX ref), không append thêm
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas });
    renderer.setSize(w, h, false); // false = không override CSS
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.08;
    controls.minDistance    = 4;
    controls.maxDistance    = camDist * 3;
    controls.minPolarAngle  = 0;
    controls.maxPolarAngle  = Math.PI * 0.85;
    controls.target.set(0, buildingHeight * 0.4, 0);
    controls.update();

    // ── Lights ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left   = -20;
    dirLight.shadow.camera.right  =  20;
    dirLight.shadow.camera.top    =  20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    const pt1 = new THREE.PointLight(0x4f46e5, 0.8);
    pt1.position.set(-15, 15, -15);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0x7c3aed, 0.8);
    pt2.position.set(15, 15, 15);
    scene.add(pt2);

    // ── Ground + grid ───────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x0f0f1e, metalness: 0.5, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(60, 60, 0x4f46e5, 0x1a1a2e);
    grid.position.y = -0.4;
    scene.add(grid);

    // ── Building ────────────────────────────────────────────────────────
    const buildingGroup = new THREE.Group();
    const aptsPerSide = Math.ceil(apartmentsPerFloor / 4);
    const aptWidth  = 1.8;
    const aptDepth  = 1.5;
    const spacing   = 0.2;
    const buildingWidth = aptsPerSide * (aptWidth + spacing) - spacing;
    const buildingDepth = aptsPerSide * (aptDepth + spacing) - spacing;

    const winMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, metalness: 0.9, roughness: 0.1,
      emissive: 0x4488ff, emissiveIntensity: 0.3,
    });

    for (let floorNum = 0; floorNum < floors; floorNum++) {
      const floorY = floorNum * (aptHeight + 0.3);

      const floorPlate = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 1, 0.15, buildingDepth + 1),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.4 })
      );
      floorPlate.position.y = floorY - 0.08;
      floorPlate.receiveShadow = floorPlate.castShadow = true;
      buildingGroup.add(floorPlate);

      const positions: Array<{ x: number; z: number }> = [];
      let count = 0;
      for (let i = 0; i < aptsPerSide && count < apartmentsPerFloor; i++, count++)
        positions.push({ x: -buildingWidth / 2 + i * (aptWidth + spacing) + aptWidth / 2, z: buildingDepth / 2 });
      for (let i = 1; i < aptsPerSide && count < apartmentsPerFloor; i++, count++)
        positions.push({ x: buildingWidth / 2, z: buildingDepth / 2 - i * (aptDepth + spacing) });
      for (let i = aptsPerSide - 1; i >= 0 && count < apartmentsPerFloor; i--, count++)
        positions.push({ x: -buildingWidth / 2 + i * (aptWidth + spacing) + aptWidth / 2, z: -buildingDepth / 2 });
      for (let i = aptsPerSide - 2; i > 0 && count < apartmentsPerFloor; i--, count++)
        positions.push({ x: -buildingWidth / 2, z: -buildingDepth / 2 + i * (aptDepth + spacing) });

      positions.forEach((pos, idx) => {
        const aptId = `${buildingCode}${String(floorNum + 1).padStart(2, "0")}${String(idx + 1).padStart(2, "0")}`;
        const sc = STATUS_COLOR[statusMapRef.current?.[aptId] ?? "unknown"];
        const baseColor   = new THREE.Color(sc.base);
        const baseEmissive = new THREE.Color(sc.emissive);
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor.clone(), metalness: 0.4, roughness: 0.4,
          emissive: baseEmissive.clone(), emissiveIntensity: sc.emissiveIntensity,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(aptWidth, aptHeight, aptDepth), mat);
        mesh.position.set(pos.x, floorY + aptHeight / 2, pos.z);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData = { isApartment: true };
        buildingGroup.add(mesh);
        aptMeshesRef.current.push({
          mesh, aptId,
          info: { aptId, floor: floorNum + 1, aptIndex: idx + 1, buildingCode },
          mat,
          baseColor:             baseColor.clone(),
          baseEmissive:          baseEmissive.clone(),
          baseEmissiveIntensity: sc.emissiveIntensity,
        });

        const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.05), winMat);
        win.position.set(pos.x, floorY + aptHeight / 2, pos.z + aptDepth / 2 + 0.03);
        buildingGroup.add(win);
      });

      const elevator = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, aptHeight, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x2d2d3d, metalness: 0.8, roughness: 0.2 })
      );
      elevator.position.set(0, floorY + aptHeight / 2, 0);
      elevator.castShadow = elevator.receiveShadow = true;
      buildingGroup.add(elevator);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.8, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.9, roughness: 0.1 })
      );
      door.position.set(0, floorY + aptHeight / 2, 1.28);
      buildingGroup.add(door);
    }

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(buildingWidth + 1.5, 0.3, buildingDepth + 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.8, roughness: 0.2 })
    );
    roof.position.y = floors * (aptHeight + 0.3) + 0.15;
    roof.castShadow = roof.receiveShadow = true;
    buildingGroup.add(roof);
    scene.add(buildingGroup);

    // ── Interaction ─────────────────────────────────────────────────────
    const allAptMeshes = aptMeshesRef.current.map((a) => a.mesh);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      const hits = raycaster.current.intersectObjects(allAptMeshes);

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const found = aptMeshesRef.current.find((a) => a.mesh === hitMesh) ?? null;
        if (found !== hoveredRef.current) {
          if (hoveredRef.current && hoveredRef.current !== selectedRef.current)
            hoveredRef.current.mat.emissiveIntensity = hoveredRef.current.baseEmissiveIntensity;
          hoveredRef.current = found;
          if (found && found !== selectedRef.current)
            found.mat.emissiveIntensity = Math.min(found.baseEmissiveIntensity + 0.45, 0.9);
        }
        if (found) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text: found.aptId });
        canvas.style.cursor = "pointer";
      } else {
        if (hoveredRef.current && hoveredRef.current !== selectedRef.current)
          hoveredRef.current.mat.emissiveIntensity = hoveredRef.current.baseEmissiveIntensity;
        hoveredRef.current = null;
        setTooltip(null);
        canvas.style.cursor = "grab";
      }
    };

    const handleClick = () => {
      if (!hoveredRef.current) {
        if (selectedRef.current) {
          selectedRef.current.mat.emissive.copy(selectedRef.current.baseEmissive);
          selectedRef.current.mat.emissiveIntensity = selectedRef.current.baseEmissiveIntensity;
          selectedRef.current = null;
          onClickRef.current?.(null);
        }
        return;
      }
      const apt = hoveredRef.current;
      if (selectedRef.current && selectedRef.current !== apt) {
        selectedRef.current.mat.emissive.copy(selectedRef.current.baseEmissive);
        selectedRef.current.mat.emissiveIntensity = selectedRef.current.baseEmissiveIntensity;
      }
      if (selectedRef.current === apt) {
        apt.mat.emissive.copy(apt.baseEmissive);
        apt.mat.emissiveIntensity = Math.min(apt.baseEmissiveIntensity + 0.45, 0.9);
        selectedRef.current = null;
        onClickRef.current?.(null);
      } else {
        apt.mat.emissive.setHex(0xffd700);
        apt.mat.emissiveIntensity = 0.85;
        selectedRef.current = apt;
        onClickRef.current?.(apt.info);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    // ── Animate ─────────────────────────────────────────────────────────
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ──────────────────────────────────────────────────────────
    const handleResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!cw || !ch) return;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      if (animationIdRef.current !== undefined) cancelAnimationFrame(animationIdRef.current);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
        }
      });
    };
  }, [floors, apartmentsPerFloor, buildingCode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-150"
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-white text-xs font-mono border border-white/20 shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
