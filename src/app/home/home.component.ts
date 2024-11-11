import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef;
  private clock = new THREE.Clock();
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private model: THREE.Group | undefined;
  private mixer!: THREE.AnimationMixer;
  private controls!: OrbitControls;
  private monitorScreen!: THREE.Mesh;
  private mouse = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private character!: THREE.Group;
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private speed = 0.1;
  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.addLights();
    this.loadCharacterModel();
    this.loadRoom();
    this.loadComputer();
    this.loadMonitor();
    this.loadMonitorTwo();
    this.loadChairGamer();
    this.loadMouse();
    this.loadKeyBoard();
    this.loadFloor();
    this.addControls();
    this.renderer.setSize(
      this.canvasRef.nativeElement.clientWidth,
      this.canvasRef.nativeElement.clientHeight
    );
    this.renderer.setAnimationLoop(this.animate.bind(this));
    window.addEventListener('keydown', (event) => this.onKeyDown(event), false);
    window.addEventListener('keyup', (event) => this.onKeyUp(event), false);
    window.addEventListener('click', (event) =>
      this.onDocumentMouseClick(event)
    );
  }

  private onDocumentMouseClick(event: MouseEvent): void {
    // Coordenadas do clique do mouse normalizadas entre -1 e 1
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Configura o raycaster para detectar interseções
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Certifique-se de que monitorScreen esteja definido
    if (this.monitorScreen) {
      const intersects = this.raycaster.intersectObject(this.monitorScreen);

      if (intersects.length > 0) {
        // Posição de destino para a câmera
        const targetPosition = new THREE.Vector3();
        this.monitorScreen.getWorldPosition(targetPosition);

        // Offset da câmera para o zoom
        const cameraOffset = new THREE.Vector3(-6, 2, -2); // Ajuste o valor para o zoom desejado
        const finalPosition = targetPosition.clone().add(cameraOffset);

        // Animação de zoom com GSAP
        gsap.to(this.camera.position, {
          x: finalPosition.x,
          y: finalPosition.y,
          z: finalPosition.z,
          duration: 1, // Duração da animação em segundos
          onUpdate: () => {
            // Fazer a câmera olhar para o monitor enquanto anima
            this.camera.lookAt(targetPosition);
          },
          onComplete: () => {
            // Atualizar o foco do OrbitControls para manter a câmera no monitor
            this.controls.target.copy(targetPosition);
            this.controls.update();
          },
        });
      }
    } else {
      console.warn('monitorScreen não está definido');
    }
  }
  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'w':
      case 'W':
        this.moveForward = true;
        break;
      case 's':
      case 'S':
        this.moveBackward = true;
        break;
      case 'a':
      case 'A':
        this.moveLeft = true;
        break;
      case 'd':
      case 'D':
        this.moveRight = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'w':
      case 'W':
        this.moveForward = false;
        break;
      case 's':
      case 'S':
        this.moveBackward = false;
        break;
      case 'a':
      case 'A':
        this.moveLeft = false;
        break;
      case 'd':
      case 'D':
        this.moveRight = false;
        break;
    }
  }

  private updateCameraMovement(): void {
    // Vetores para calcular a direção de movimento com base na rotação da câmera
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Obtém a direção atual da câmera
    this.camera.getWorldDirection(direction);

    // Cria um vetor para a direita da câmera, invertendo a direção para corrigir o movimento
    right.crossVectors(direction, this.camera.up).normalize();

    // Move a câmera conforme as teclas pressionadas
    if (this.moveForward) {
      this.camera.position.addScaledVector(direction, this.speed);
    }
    if (this.moveBackward) {
      this.camera.position.addScaledVector(direction, -this.speed);
    }
    if (this.moveLeft) {
      this.camera.position.addScaledVector(right, -this.speed);
    }
    if (this.moveRight) {
      this.camera.position.addScaledVector(right, this.speed);
    }

    // Atualiza a target dos controles para a nova posição da câmera
    const focusPoint = new THREE.Vector3();
    focusPoint.copy(this.camera.position).add(direction);
    this.controls.target.copy(focusPoint);
    this.controls.update();
  }

  private createScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xaaaaaa);
  }

  private addControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Suaviza o movimento dos controles
    this.controls.dampingFactor = 0.25; // Ajuste da suavidade
    this.controls.enableZoom = true; // Permite o zoom

    const focusPoint = new THREE.Vector3(-2, 7, -1.5); // Mesmo ponto usado no lookAt
    this.controls.target.copy(focusPoint);
    this.controls.update();
  }

  private createCamera(): void {
    const fov = 50;
    const aspect =
      this.canvasRef.nativeElement.clientWidth /
      this.canvasRef.nativeElement.clientHeight;
    const near = 0.1; // Reduz para 0.1 para evitar clipping próximo
    const far = 2000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(15, 5, 8);

    const focusPoint = new THREE.Vector3(0, 0, -1.5);
    this.camera.lookAt(focusPoint);
  }
  private createRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.canvasRef.nativeElement.appendChild(this.renderer.domElement);
  }
  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 3); // Aumente a intensidade
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  private loadCharacterModel(): void {
    const loader = new FBXLoader();
    loader.load(
      '../../assets/Typing.fbx', // Substitua pelo caminho do modelo do personagem
      (fbx) => {
        this.character = fbx;

        // Aumente a escala do personagem para ajustá-lo ao ambiente
        this.character.scale.set(0.05, 0.05, 0.05); // Aumente conforme necessário

        // Posiciona o personagem para sentar-se na cadeira
        this.character.position.set(-1.7, -3.2, 2.3); // Ajuste conforme necessário para que ele fique na cadeira
        this.character.rotation.y = Math.PI / 2; // Gira o personagem para que ele fique voltado para a mesa

        // Configuração da animação
        this.mixer = new THREE.AnimationMixer(this.character);
        const action = this.mixer.clipAction(fbx.animations[0]); // Assumindo que a animação de digitação é a primeira
        action.play();

        this.scene.add(this.character);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo do personagem:', error);
      }
    );
  }

  private loadRoom(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/office_table/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(0.07, 0.07, 0.07); // Ajuste a escala conforme necessário
        roomModel.position.set(0, 0, 0); // Posiciona no centro da cena
        roomModel.rotation.y = Math.PI / 2;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  loadComputer(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/computer_case/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(0.5, 0.5, 0.5); // Ajuste a escala conforme necessário
        roomModel.position.set(4, 0.2, 5.5); // Posiciona no centro da cena
        roomModel.rotation.y = -Math.PI / 2;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  loadMonitor(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/office_monitor__workstation_monitor/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(0.005, 0.005, 0.005); // Ajuste a escala conforme necessário
        roomModel.position.set(4, 0.4, 2); // Posiciona no centro da cena
        roomModel.rotation.y = -Math.PI / 1;
        this.monitorScreen = roomModel.children[0] as THREE.Mesh;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('../../assets/myImage.jpg', (texture) => {
          // Criar um material básico com a textura
          const screenMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xffffff,
          });

          // Criar uma geometria plana para representar a tela
          const screenGeometry = new THREE.PlaneGeometry(55, 55); // Ajuste a largura e altura conforme necessário

          // Criar uma malha com a geometria e o material
          const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);

          // Ajuste a posição e a rotação do plano para sobrepor a tela do monitor
          screenMesh.position.set(0, 0.4, 0.05); // Posiciona próximo da tela, ajustando Z para frente da tela
          screenMesh.rotation.y = 0; // Ajuste a rotação conforme necessário

          // Adicione o plano como filho do monitor para facilitar o posicionamento
          this.monitorScreen.add(screenMesh);
        });
        this.createButtonOnScreen();
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  private createButtonOnScreen(): void {
    // Criar uma geometria e material para o botão
    const buttonGeometry = new THREE.PlaneGeometry(55, 55); // Ajuste o tamanho do botão
    const buttonMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Cor do botão

    // Criar o botão como uma malha (mesh)
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);

    // Posicione o botão sobre a tela do monitor
    buttonMesh.position.set(0, 0.3, 0.06); // Ajuste a posição para que fique na frente do monitor
    buttonMesh.rotation.y = 0; // Ajuste a rotação se necessário

    // Adicione o botão como um filho do monitor ou posicione na frente da tela
    this.monitorScreen.add(buttonMesh);

    // Listener para detectar clique no botão usando Raycaster
    window.addEventListener('click', (event) =>
      this.onButtonClick(event, buttonMesh)
    );
  }

  private onButtonClick(event: MouseEvent, buttonMesh: THREE.Mesh): void {
    // Configuração do Raycaster para detectar o clique
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Verificar interseção com o botão
    const intersects = this.raycaster.intersectObject(buttonMesh);
    if (intersects.length > 0) {
      console.log('Botão clicado!');
      // Coloque aqui a ação que deseja realizar ao clicar no botão
    }
  }

  loadMonitorTwo(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/office_monitor__workstation_monitor/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(0.005, 0.005, 0.005); // Ajuste a escala conforme necessário
        roomModel.position.set(3.5, 0.4, -2.3); // Posiciona no centro da cena
        roomModel.rotation.y = -Math.PI / 1.1;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  loadChairGamer(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/chair_gamer_free_model_by_oscar_creativo/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(5, 5, 5); // Ajuste a escala conforme necessário
        roomModel.position.set(-1.7, -3.5, 2.3); // Posiciona no centro da cena
        roomModel.rotation.y = Math.PI / 2;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  loadMouse(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/mouse_-_razer_deathadder/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(0.6, 0.6, 0.6); // Ajuste a escala conforme necessário
        roomModel.position.set(1.4, 0.13, 3.9); // Posiciona no centro da cena
        roomModel.rotation.y = -Math.PI / 2;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  loadKeyBoard(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/pc_keyboard/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(5, 5, 5); // Ajuste a escala conforme necessário
        roomModel.position.set(1.4, -0.4, 2.3); // Posiciona no centro da cena
        roomModel.rotation.y = -Math.PI / 2;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  loadFloor(): void {
    const loader = new GLTFLoader();
    loader.load(
      '../../assets/seamless__floor_tiled_texture_v/scene.gltf', // Caminho para o arquivo .gltf da sala
      (gltf) => {
        const roomModel = gltf.scene;
        roomModel.scale.set(5, 5, 5); // Ajuste a escala conforme necessário
        roomModel.position.set(1.4, -3.2, 2.3); // Posiciona no centro da cena
        roomModel.rotation.y = -Math.PI / 2;
        this.scene.add(roomModel); // Adiciona a sala ao ambiente
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% carregado');
      },
      (error) => {
        console.error('Erro ao carregar o modelo da sala:', error);
      }
    );
  }

  private animate(): void {
    const delta = this.clock.getDelta();
    if (this.mixer) {
      this.mixer.update(delta); // Atualiza o mixer para animar
    }
    this.updateCameraMovement();
    this.renderer.render(this.scene, this.camera);
  }
}
