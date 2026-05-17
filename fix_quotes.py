import os

file_path = '/Users/benlee/GitHub/audirockets-/f1_dashboard/src/lib/drivers-static.ts'

replacements = [
    # 1. Fix garbled "don\'s" corruptions
    ("{ text: \"Yes! Yes! Champion! World champion! I don\\'s believe it!\", source: { race: 'Japanese Grand Prix', year: 2022 } },",
     "{ text: \"Yes! Yes! Champion! World champion! I don't believe it!\", source: { race: 'Japanese Grand Prix', year: 2022 } },"),
    ("{ text: \"I don\\'s back out. I never back out. That's just how I race.\", source: { race: 'Brazilian Grand Prix', year: 2022 } },",
     "{ text: \"I don't back out. I never back out. That's just how I race.\", source: { race: 'Brazilian Grand Prix', year: 2022 } },"),
    ("{ text: \"Every lap I push harder. I don\\'s know any other way.\", source: { race: 'Haas season launch', year: 2025 } },",
     "{ text: \"Every lap I push harder. I don't know any other way.\", source: { race: 'Haas season launch', year: 2025 } },"),
    ("{ text: \"The walls don\\'s scare me here. They make me faster.\", source: { race: 'Las Vegas Grand Prix qualifying', year: 2024 } },",
     "{ text: \"The walls don't scare me here. They make me faster.\", source: { race: 'Las Vegas Grand Prix qualifying', year: 2024 } },"),

    # 2. Replace pre-2020 Hamilton quotes
    ("{ text: \"This team. These people. I\\'d do it all over again without question.\", source: { race: 'British Grand Prix', year: 2019 } },",
     "{ text: \"Seven times. Seven world championships. I cannot believe it.\", source: { race: 'Turkish Grand Prix', year: 2020 } },"),
    ("{ text: \"The rain doesn\\'t scare me. It never has. It sets me free.\", source: { race: 'German Grand Prix', year: 2008 } },",
     "{ text: \"I'm going to Ferrari. It's probably the most exciting decision I've ever made in my life.\", source: { race: 'Press announcement', year: 2024 } },"),
    ("{ text: \"Pole! I\\'ve given absolutely everything I have. That's all I can give.\", source: { race: 'Monaco Grand Prix qualifying', year: 2019 } },",
     "{ text: \"Lewis Hamilton, you absolute legend!\", source: { race: 'British Grand Prix', year: 2020 } },"),

    # 3. Replace pre-2020 Leclerc quotes
    ("{ text: \"I gave everything I had. I really gave everything I had.\", source: { race: 'Italian Grand Prix', year: 2019 } },",
     "{ text: \"We are back! Ferrari is back! This is just the beginning!\", source: { race: 'Bahrain Grand Prix', year: 2022 } },"),
    ("{ text: \"This is for my grandfather. He would have loved this.\", source: { race: 'Italian Grand Prix', year: 2019 } },",
     "{ text: \"P1 in Australia! Incredible! Come on Ferrari! Come on guys!\", source: { race: 'Australian Grand Prix', year: 2022 } },"),

    # 4. Replace pre-2020 Alonso quote
    ("{ text: \"I am Fernando Alonso. I am the best driver in the world. I have no doubt.\", source: { race: 'Abu Dhabi Grand Prix', year: 2012 } },",
     "{ text: \"P3! Podium! Come on! Come on! YES! Thirty-two years and I am still here!\", source: { race: 'Bahrain Grand Prix', year: 2023 } },"),

    # 5. Replace pre-2020 Ricciardo quotes
    ("{ text: \"Bwoah! Shoey! Who wants a shoey?! We are winning!\", source: { race: 'Monaco Grand Prix', year: 2018 } },",
     "{ text: \"P3! Monza! Oh my God! Wooooooo! Come on boys! Let's go!\", source: { race: 'Italian Grand Prix', year: 2021 } },"),
    ("{ text: \"Checkered flag, baby! Come on! That is a race win!\", source: { race: 'Monaco Grand Prix', year: 2018 } },",
     "{ text: \"I've been knocked down more times than I can count. But I always get back up smiling.\", source: { race: 'McLaren exit statement', year: 2022 } },"),
    ("{ text: \"I back myself every time. Every single time, I back myself.\", source: { race: 'Red Bull season review', year: 2018 } },",
     "{ text: \"The honey badger is back. Don't forget about me.\", source: { race: 'RB season launch', year: 2023 } },"),
    ("{ text: \"Never underestimate the honey badger. Never.\", source: { race: 'Australian Grand Prix', year: 2016 } },",
     "{ text: \"Thank you to everyone in Formula 1. This sport gave me everything I ever wanted.\", source: { race: 'Retirement statement', year: 2024 } },"),
]

with open(file_path, 'r') as f:
    content = f.read()

count = 0
new_content = content
for old_text, new_text in replacements:
    if old_text in new_content:
        new_content = new_content.replace(old_text, new_text)
        count += 1
    else:
        print(f"FAILED TO FIND:\n{old_text}\n")

with open(file_path, 'w') as f:
    f.write(new_content)

print(f"Total replacements made: {count}")
