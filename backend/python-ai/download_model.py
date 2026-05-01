import urllib.request, os
path = 'face_landmarker.task'
if not os.path.exists(path):
    print('Downloading face_landmarker.task...')
    urllib.request.urlretrieve(
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        path
    )
    print('Done.')
else:
    print('Model already present.')
