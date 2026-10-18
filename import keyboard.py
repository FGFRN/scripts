import keyboard
import pyautogui
import time
import pyperclip
import sys

positions = []          # 存储坐标
RrecBut=1211
LeftTime=1324
RightTime=1440
recording = True        # 是否处于录制状态

def StartPrinter():
    print("按 ALT 记录坐标")
    print("按 ESC 开始执行")
    print(f"右播放键位置{RrecBut}，时长左位置{LeftTime}，时长右位置{RightTime}")
    print("按下F1 F2 F3以分别修改这三个值")

def operate(x, y):
    print(f"\n开始执行坐标: ({x}, {y})")

    pyautogui.moveTo(x, y, duration=0.3)
    pyautogui.click(x, y)
    time.sleep(0.3)

    pyautogui.click(RrecBut, y)

    pyautogui.moveTo(LeftTime, y, duration=0.3)

    pyautogui.mouseDown(button="left")

    pyautogui.moveTo(RightTime, y, duration=0.15)

    pyautogui.mouseUp(button="left")

    time.sleep(0.05)

    pyautogui.hotkey("ctrl", "c")

    text = pyperclip.paste().strip()

    print("复制到的内容是：", repr(text))

    try:
        target_time = text.split("/")[-1].strip()
        minute, second = map(int, target_time.split(":"))
        pyperclip.copy("default")
    except ValueError:
        print("复制内容无法解析为时间")
        pyautogui.click(x, y)

        print("执行未完成")
        return -1

    wait_time = minute * 60 + second + 0.2

    print(f"等待 {wait_time} 秒")

    time.sleep(wait_time)

    pyautogui.click(x, y)

    print("执行完成")

    time.sleep(0.5)
    return 0

def record_position():
    global recording

    if not recording:
        return

    x, y = pyautogui.position()

    positions.append((x, y))

    print(f"已记录坐标: ({x}, {y})")
    print(f"当前共记录 {len(positions)} 个坐标")

def Rec_RrecBut():
    global RrecBut

    if not recording:
        return

    x, y = pyautogui.position()

    RrecBut = x

    print(f"已记录RrecBut: {RrecBut}")
def Rec_LeftTime():
    global LeftTime

    if not recording:
        return

    x, y = pyautogui.position()

    LeftTime = x

    print(f"已记录LeftTime: {LeftTime}")
def Rec_RightTime():
    global RightTime

    if not recording:
        return

    x, y = pyautogui.position()

    RightTime = x

    print(f"已记录RightTime: {RightTime}")

def execute_all():
    global recording
    global positions

    if not recording:
        return

    recording = False

    print("\n========== 开始执行 ==========")

    if len(positions) == 0:
        print("没有记录任何坐标")
    else:
        for i, (x, y) in enumerate(positions, start=1):
            print(f"\n[{i}/{len(positions)}]")
            res = operate(x, y)
            if res == -1:
                break

    print("\n========== 全部执行完成 ==========")

    positions.clear()

    recording = True

    print("\n重新进入录制模式")
    StartPrinter()


StartPrinter()


keyboard.add_hotkey("alt", record_position)
keyboard.add_hotkey("esc", execute_all)
keyboard.add_hotkey("f1", Rec_RrecBut)
keyboard.add_hotkey("f2", Rec_LeftTime)
keyboard.add_hotkey("f3", Rec_RightTime)

keyboard.wait("home")