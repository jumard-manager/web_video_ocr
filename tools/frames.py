import cv2
import os
import sys

def extract_frames(input_video_path, output_folder, interval_seconds=5):
    # ビデオキャプチャの作成
    cap = cv2.VideoCapture(input_video_path)

    # フレームレートの取得
    fps = cap.get(cv2.CAP_PROP_FPS)

    # 保存用のフォルダを作成
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # フレームを取得して保存
    frame_number = 0
    while True:
        ret, frame = cap.read()

        # フレームがなくなったら終了
        if not ret:
            break

        # 一定の間隔ごとにフレームを保存
        if frame_number % int(fps * interval_seconds) == 0:
            output_path = os.path.join(output_folder, f"{input_video_path.split('.')[0]}_frame_{frame_number // int(fps)}.jpg")
            cv2.imwrite(output_path, frame)

        frame_number += 1

    # キャプチャの解放
    cap.release()

# ex) python frames.py 1.mov output_frames 5
if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python script.py <input_video_path> <output_folder> <interval_seconds>")
        sys.exit(1)

    input_video_path = sys.argv[1]  # 入力動画ファイルのパスをコマンドライン引数から取得
    output_folder = sys.argv[2]  # フレームを保存するフォルダのパスをコマンドライン引数から取得
    interval_seconds = float(sys.argv[3])  # 保存する間隔を秒でコマンドライン引数から取得

    extract_frames(input_video_path, output_folder, interval_seconds)
