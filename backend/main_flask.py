import sys,os
import deeplabcut
#track part
#sys.path.insert(0, "F:\\workspace\\AnimalBehaviorDesktop\\backend\\track_part")
# sys.path.insert(0, 'D:\\workspace\\AnimalBehaviorDesktop\\backend')
sys.path.insert(0, 'D:\\zjh\AnimalBehaviorDesktop\\backend\\yolov5')
from track_part.track_process import *
from track_part.draw_result import draw_raw_img
from track_part.ouput_video import output_video
from track_part.output_video_part import output_video_part
from track_part.convert_dlc_to_simple_csv import convert_dlc_to_simple_csv
from track_part.gazeheatplot import draw_heat_main
#from deeplabcut import analyze_videos
###
from distutils.command.config import config
from camera_device import Camera
from flask import Flask
app = Flask(__name__)
from flask import request
from flask import json
from flask_cors import CORS
CORS(app, resources=r'/*')	# 注册CORS, "/*" 允许访问所有api
from behavior_recognition import start_recognition
config_json = None
cam = Camera()
@app.route('/')
def hello_world():
    return 'Hello World'

@app.route('/api/config',methods=['POST','GET'])
def load_config():
    if request.method == 'POST':
        print(request)
        filename = request.values.get('config_filename',0)
        if filename == 0:
            return app.response_class(
                status=404,
                mimetype='application/json'
            )
        with open(filename, 'r') as f:
            global config_json
            config_json = json.load(f)
            return config_json
    if request.method == 'GET':
        if config_json is not None:
            return config_json
        else:
            return app.response_class(
                response=json.dumps("{}"),
                status=204,
                mimetype='application/json'
            )

@app.route('/api/open_camera',methods=['POST','GET'])
def open_camera():
    cam.open()

@app.route('/api/start_record',methods=['POST','GET'])
def start_record():
    filename = json.loads(request.data)
    filename = filename['video_filename']
    print(filename)
    cam.start(filename)

@app.route('/api/close_camera',methods=['POST','GET'])
def close_camera():
    cam.close()

@app.route('/api/stop_record',methods=['POST','GET'])
def stop_record():
    try:
        cam.stop()
    except:
        print('error')
    filename = json.loads(request.data)
    filename = filename['video_filename']
    start_recognition(filename)

@app.route('/api/runtrack', methods=['GET', 'POST'])
def execute():
    data = json.loads(request.data)
    argvs = data['argvs']
    #print(argvs)
    namelist = []
    polylist = []
    video_width = argvs[0]
    video_height = argvs[1]
    video_path = argvs[-3]
    video_name = argvs[-2]
    check_out_list = argvs[-1]
    rect_num = int(argvs[2])
    resize = 2.4 #尺寸映射
    for i in range (3,3+rect_num):
        name, poly = preProcessRecInfo(argvs[i])
        namelist.append(name)
        poly = poly.tolist()
        for points in poly:
            for i in range(2):
                points[i] =int(points[i]*resize)
        polylist.append(poly)
    poly_num = int(argvs[3+rect_num])
    
    for i in range (4+rect_num,4+rect_num+poly_num):
        name, poly = preProcessPolyInfo(argvs[i])
        for points in poly:
            for i in range(2):
                points[i] =int(points[i]*resize)
        namelist.append(name)
        polylist.append(poly)
    print(namelist)
    print(polylist)
    resultpath = video_path+"/result/"
    csv_path = resultpath+video_name+".csv"
    #videopath = video.mp4's path
    #videoname = video
    #video_path = "C:\\Users\\Sun\\Desktop\\maze\\eight_maze_short_demo.mp4"
    if not os.path.exists(resultpath):
        os.mkdir(resultpath)
    if not os.path.exists(csv_path):
        originalvideopath = video_path+"/"+video_name+".mp4"
        deeplabcut.analyze_videos(config="D:/workspace/DLC/config.yaml",videos=[originalvideopath],destfolder=video_path,save_as_csv=True,n_tracks=1)
        deeplabcut.analyze_videos_converth5_to_csv(video_path,'.mp4')  
        originalcsv = video_path+"/"+video_name+"DLC_dlcrnetms5_MOT_NEWJul27shuffle1_50000_el.csv"
        convert_dlc_to_simple_csv(originalcsv,csv_path)
    draw_raw_img(namelist,polylist,video_width,video_height,video_name,resultpath)
    draw_heat_main(csv_path,video_height,video_width,video_name,resultpath)
    isPoiWithinPoly(csv_path,polylist,namelist,video_name,video_path,resultpath)
    output_video_part(video_path,video_name,polylist,namelist,resultpath,check_out_list)
    #output_video(video_path,video_name,polylist,namelist,resultpath)
    return ('done')
	
@app.route('/api/wash_recognition', methods=['POST', 'GET'])
def wash_recognition():
    filename = json.loads(request.data)
    filename = filename['video_filename']
    print(filename)
    start_recognition(filename)

if __name__ == '__main__':
    app.run(host='127.0.0.1',port=5001)
