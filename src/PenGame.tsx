import React, { Component, createRef, RefObject } from 'react';

// Interface for the shape
interface Shape {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  color: string;
  strokeWidth: number;
}

// Interface for the state
interface PenGameState {
  selectedFeatures: string[];
  description: string;
  showCanvas: boolean;
  strokeColor: string;
  strokeWidth: number;
  currentShape: string;
  shapeWidth: number;
  shapeHeight: number;
  shapeRadius: number;
  shapes: Shape[];
  drawingPoints: { x: number; y: number }[];
  isDrawing: boolean;
  dragging: number | null;
  offsetX: number;
  offsetY: number;
  showThankYou: boolean;
}

const featuresList = [
  "Smooth Grip", "Retractable Tip", "Ink Color Change", "Stylus End", "Clip-On Cap",
  "Pocket Clip", "Refillable Ink", "Erasable Ink", "LED Light", "Ruler Markings",
  "Laser Pointer", "Multi-color Ink", "Highlighter End", "Custom Logo", "Eco-friendly Material",
  "Lightweight Design", "Textured Body", "Matte Finish", "Glossy Finish", "Comfort Grip"
];

class PenGame extends Component<{}, PenGameState> {
  canvasRef: RefObject<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      selectedFeatures: [],
      description: '',
      showCanvas: false,
      strokeColor: '#000000', // Default stroke color (black)
      strokeWidth: 4, // Default brush size
      currentShape: 'freehand', // Default tool is freehand drawing
      shapeWidth: 100, // Default shape width
      shapeHeight: 100, // Default shape height
      shapeRadius: 50, // Default shape radius (for circles)
      shapes: [], // Array to store shapes
      drawingPoints: [], // For freehand drawing
      isDrawing: false, // Is currently drawing freehand
      dragging: null, // Currently dragging shape
      offsetX: 0,
      offsetY: 0,
      showThankYou: false,
    };
    this.canvasRef = createRef();
  }

  componentDidMount() {
    const canvas = this.canvasRef.current;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
    }
  }

  componentDidUpdate() {
    const canvas = this.canvasRef.current;
    if (canvas && !this.ctx) {
      this.ctx = canvas.getContext('2d');
    }
  }

  handleFeatureSelect = (feature: string) => {
    const { selectedFeatures } = this.state;
    if (selectedFeatures.includes(feature)) {
      this.setState({ selectedFeatures: selectedFeatures.filter(f => f !== feature) });
    } else if (selectedFeatures.length < 3) {
      this.setState({ selectedFeatures: [...selectedFeatures, feature] });
    }
  };

  handleSubmit = () => {
    this.setState({ showThankYou: true });
  };

  handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ strokeColor: event.target.value });
  };

  handleBrushSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ strokeWidth: parseInt(event.target.value, 10) });
  };

  handleShapeSelect = (shape: string) => {
    this.setState({ currentShape: shape });
  };

  handleShapeWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ shapeWidth: parseInt(event.target.value, 10) });
  };

  handleShapeHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ shapeHeight: parseInt(event.target.value, 10) });
  };

  handleShapeRadiusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ shapeRadius: parseInt(event.target.value, 10) });
  };

  // Start drawing or selecting shape
  handleMouseDown = (event: React.MouseEvent) => {
    const canvas = this.canvasRef.current;
    if (!canvas || !this.ctx) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (this.state.currentShape === 'freehand') {
      this.setState({ isDrawing: true });
      const ctx = this.ctx;

      if (!ctx) return;

      ctx.strokeStyle = this.state.strokeColor;
      ctx.lineWidth = this.state.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(mouseX, mouseY);
      this.setState({ drawingPoints: [{ x: mouseX, y: mouseY }] });
    } else {
      const shapeIndex = this.getClickedShape(mouseX, mouseY);
      if (shapeIndex !== -1) {
        const shape = this.state.shapes[shapeIndex];
        this.setState({
          dragging: shapeIndex,
          offsetX: mouseX - shape.x,
          offsetY: mouseY - shape.y,
        });
      } else {
        const newShape: Shape = {
          type: this.state.currentShape,
          x: mouseX,
          y: mouseY,
          width: this.state.shapeWidth,
          height: this.state.shapeHeight,
          radius: this.state.shapeRadius,
          color: this.state.strokeColor,
          strokeWidth: this.state.strokeWidth,
        };

        this.setState(prevState => ({
          shapes: [...prevState.shapes, newShape],
          dragging: null,
        }), this.redrawCanvas);
      }
    }
  };

  // Handle dragging or freehand drawing
  handleMouseMove = (event: React.MouseEvent) => {
    const canvas = this.canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (this.state.currentShape === 'freehand') {
      const { isDrawing } = this.state;
      if (!isDrawing || !this.ctx) return;

      const ctx = this.ctx;
      ctx.lineTo(mouseX, mouseY);
      ctx.stroke();

      this.setState((prevState) => ({
        drawingPoints: [...prevState.drawingPoints, { x: mouseX, y: mouseY }],
      }));
    } else {
      const { dragging, offsetX, offsetY, shapes } = this.state;
      if (dragging === null) return;

      const updatedShapes = [...shapes];
      const draggedShape = updatedShapes[dragging];
      draggedShape.x = mouseX - offsetX;
      draggedShape.y = mouseY - offsetY;

      this.setState({ shapes: updatedShapes }, this.redrawCanvas);
    }
  };

  // Stop freehand drawing or dragging
  handleMouseUp = () => {
    if (this.state.currentShape === 'freehand') {
      const ctx = this.ctx;
      if (ctx) ctx.closePath();
      this.setState({ isDrawing: false });
    } else {
      this.setState({ dragging: null });
    }
  };

  // Detect if a shape is clicked
  getClickedShape = (mouseX: number, mouseY: number) => {
    const { shapes } = this.state;
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.type === 'rectangle' || shape.type === 'line') {
        if (mouseX > shape.x && mouseX < shape.x + shape.width &&
            mouseY > shape.y && mouseY < shape.y + shape.height) {
          return i;
        }
      } else if (shape.type === 'circle') {
        const distance = Math.sqrt((mouseX - shape.x) ** 2 + (mouseY - shape.y) ** 2);
        if (distance < shape.radius) {
          return i;
        }
      }
    }
    return -1;
  };

  // Redraw the canvas
  redrawCanvas = () => {
    const canvas = this.canvasRef.current;
    if (!canvas || !this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.state.shapes.forEach(shape => {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;

      if (shape.type === 'rectangle' || shape.type === 'line') {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  };

  render() {
    const { selectedFeatures, showCanvas, strokeColor, strokeWidth, currentShape, shapeWidth, shapeHeight, shapeRadius, showThankYou } = this.state;

    const shapeOptions = [
      { label: 'Freehand', value: 'freehand' },
      { label: 'Circle', value: 'circle' },
      { label: 'Rectangle', value: 'rectangle' },
      { label: 'Line', value: 'line' },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-200 p-8">
        <h1 className="text-5xl font-bold text-center text-blue-800 mb-4">Revamp the Pen Game</h1>

        {selectedFeatures.length > 0 && (
          <div className="text-center text-lg text-gray-700 mb-6">
            <h3 className="font-semibold">Selected Features:</h3>
            <ul className="flex justify-center space-x-4">
              {selectedFeatures.map((feature, index) => (
                <li key={index} className="bg-gray-200 px-3 py-1 rounded-md shadow-sm">{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {!showCanvas ? (
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Select 3 Pen Features:</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {featuresList.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => this.handleFeatureSelect(feature)}
                  className={`p-2 border rounded-lg transition duration-300 ${
                    selectedFeatures.includes(feature) ? 'bg-blue-500 text-white' : 'bg-white'
                  } hover:bg-blue-100`}
                  disabled={selectedFeatures.includes(feature) || (selectedFeatures.length === 3 && !selectedFeatures.includes(feature))}
                >
                  {feature}
                </button>
              ))}
            </div>

            {selectedFeatures.length === 3 && (
              <button
                onClick={() => this.setState({ showCanvas: true })}
                className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition"
              >
                Proceed to Drawing Stage
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            {showThankYou ? (
              <div className="text-center">
                <h2 className="text-3xl font-semibold text-green-700 mb-4">Thank You!</h2>
                <p className="text-lg">Thank you for playing the game. We will come back with the results soon after analyzing your design.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Design Your Pen</h2>

                {/* Color Picker */}
                <div className="mb-4">
                  <h3 className="font-semibold text-lg mb-2">Choose Brush Color:</h3>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={this.handleColorChange}
                    className="w-16 h-16"
                  />
                </div>

                {/* Brush Size Slider */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">Adjust Brush Size:</h3>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth}
                    onChange={this.handleBrushSizeChange}
                    className="w-full"
                  />
                  <p>Brush Size: {strokeWidth}px</p>
                </div>

                {/* Shape Drawing Toolbar */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">Select a Tool or Shape:</h3>
                  <div className="flex space-x-4">
                    {shapeOptions.map((shapeOption) => (
                      <button
                        key={shapeOption.value}
                        onClick={() => this.handleShapeSelect(shapeOption.value)}
                        className={`py-2 px-4 rounded-lg ${
                          currentShape === shapeOption.value ? 'bg-blue-500 text-white' : 'bg-gray-300'
                        } hover:bg-blue-600`}
                      >
                        {shapeOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Canvas */}
                <canvas
                  ref={this.canvasRef}
                  className="border-2 border-gray-400 mb-4 rounded-lg"
                  width="500"
                  height="400"
                  onMouseDown={this.handleMouseDown}
                  onMouseMove={this.handleMouseMove}
                  onMouseUp={this.handleMouseUp}
                />

                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => this.setState({ showCanvas: false })}
                    className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition"
                  >
                    Go Back
                  </button>
                </div>

                <textarea
                  placeholder="Describe your pen design..."
                  className="w-full p-4 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={4}
                  value={this.state.description}
                  onChange={(e) => this.setState({ description: e.target.value })}
                />

                <button
                  onClick={this.handleSubmit}
                  className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition"
                >
                  Submit Pen Design
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default PenGame;
