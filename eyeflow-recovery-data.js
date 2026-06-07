window.EyeFlowRecoveryData = {
  recoveryModeMeta: {
    light: {
      label: "轻量",
      copy: "全屏恢复会用远眺、慢眨眼和闭眼，把节奏放轻一点。"
    },
    neck: {
      label: "肩颈",
      copy: "强制爱会重点带你放松下巴、肩膀和颈侧。"
    },
    breath: {
      label: "呼吸",
      copy: "强制爱会用闭眼、掌心热敷和慢呼吸，帮助眼睛从屏幕里退出来。"
    },
    exercise: {
      label: "眼保健操",
      copy: "强制爱会加入轻按眼周骨缘的步骤，不按压眼球。"
    },
    mixed: {
      label: "混合",
      copy: "强制爱会组合远眺、眨眼、呼吸和肩颈放松。"
    }
  },
  recoveryTaskLibrary: {
    gaze: {
      mood: "gaze",
      label: "远眺",
      title: "跟 Mira 一起看远处",
      copy: "把视线移到 6 米外。Mira 也看向远处，你不用盯着屏幕。",
      caption: "先把视线放远",
      voiceCue: "把视线放到远处。不要盯屏幕，只是轻轻看过去。"
    },
    blink: {
      mood: "blink",
      label: "慢眨眼",
      title: "跟 Mira 慢慢眨眼",
      copy: "跟着 Mira 的节奏眨 8 次，每一次都闭完整一点。",
      caption: "慢慢眨，不要急",
      voiceCue: "慢慢眨眼。每一次都闭完整一点，再自然睁开。"
    },
    close: {
      mood: "close",
      label: "闭眼",
      title: "和 Mira 一起闭眼",
      copy: "闭眼 10 秒，把眉心、下巴和屏幕里的紧张一起放下来。",
      caption: "眼睛先休息",
      voiceCue: "现在闭眼。眉心放松，下巴也松一点。"
    },
    breath: {
      mood: "breath",
      label: "慢呼吸",
      title: "跟 Mira 慢慢呼吸",
      copy: "吸气时肩膀不要抬，呼气时让眼眶周围松一点。",
      caption: "呼气时放松",
      voiceCue: "吸气不用用力。呼气时，让眼眶周围松下来。"
    },
    palms: {
      mood: "breath",
      label: "掌心",
      title: "用掌心给眼睛一点暗处",
      copy: "搓热双手，轻轻罩在闭上的眼睛外侧，不压眼球。",
      caption: "只遮光，不按压",
      voiceCue: "双手轻轻罩在眼睛外侧。只遮光，不要压眼球。"
    },
    neck: {
      mood: "neck",
      label: "肩颈",
      title: "跟 Mira 放松肩颈",
      copy: "下巴微收，肩膀慢慢沉下去，感觉后颈慢慢变长。",
      caption: "肩膀慢慢沉下去",
      voiceCue: "下巴微收。肩膀慢慢沉下去，后颈变长一点。"
    },
    jaw: {
      mood: "neck",
      label: "下颌",
      title: "把下颌松开一点",
      copy: "牙齿轻轻分开，舌尖自然放松，别让脸部继续用力。",
      caption: "脸也放松",
      voiceCue: "牙齿轻轻分开。舌尖放松，让脸也休息一下。"
    },
    sideNeck: {
      mood: "neck",
      label: "颈侧",
      title: "把颈侧放松下来",
      copy: "头轻轻偏向一侧，不要用力拉。换边时慢一点。",
      caption: "颈侧也松一点",
      voiceCue: "头轻轻偏向一侧。不用拉扯，只让颈侧慢慢松开。"
    },
    shoulderBlade: {
      mood: "neck",
      label: "肩胛",
      title: "让肩胛慢慢往后下",
      copy: "轻轻展开胸口，肩胛像往后下方滑一点，不要耸肩。",
      caption: "后背也松开",
      voiceCue: "肩胛往后下方轻轻滑一点。不要耸肩。"
    },
    brow: {
      mood: "press",
      label: "眉头",
      title: "轻按眉头附近",
      copy: "用舒服的力度按揉眉头上方的骨缘，不按压眼球。",
      caption: "只按骨缘，不压眼球",
      voiceCue: "轻按眉头上方的骨缘。力度舒服，不压眼球。"
    },
    underEye: {
      mood: "press",
      label: "眼下",
      title: "轻揉眼下骨缘",
      copy: "沿着眼下方骨缘轻轻打圈，力度保持很轻。",
      caption: "轻一点就够了",
      voiceCue: "沿眼下骨缘轻轻打圈。轻一点就够了。"
    },
    temple: {
      mood: "press",
      label: "太阳穴",
      title: "放松太阳穴周围",
      copy: "用指腹在太阳穴附近慢慢打圈，保持呼吸平稳。",
      caption: "慢慢打圈",
      voiceCue: "太阳穴附近慢慢打圈。呼吸保持平稳。"
    }
  },
  recoveryModeTasks: {
    light: ["gaze", "blink", "breath", "close"],
    neck: ["gaze", "jaw", "neck", "sideNeck", "shoulderBlade", "close"],
    breath: ["gaze", "close", "palms", "breath"],
    exercise: ["gaze", "brow", "underEye", "temple", "close"],
    mixed: ["gaze", "blink", "breath", "jaw", "neck", "close"]
  }
};
