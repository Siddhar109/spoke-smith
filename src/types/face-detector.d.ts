interface FaceDetectorOptions {
  maxDetectedFaces?: number
  fastMode?: boolean
}

interface DetectedFace {
  boundingBox: DOMRectReadOnly
}

interface FaceDetector {
  detect: (image: ImageBitmapSource) => Promise<DetectedFace[]>
}

interface FaceDetectorConstructor {
  new (options?: FaceDetectorOptions): FaceDetector
}

declare var FaceDetector: FaceDetectorConstructor | undefined
