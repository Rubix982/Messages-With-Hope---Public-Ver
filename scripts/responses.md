# User Enters Chat
### ( Keep adding more dialogues for Wit.Ai, more data better performance )

## KEYWORDDS

- Handled in APP.JS simply, denoted by *L*
- Handled by Wit.Ai, denoted by *W*

## MAIN FLOW OF DIALOG - GETTING THE INFORMATION

### Greeting Intent - **DONE**

> When `greeting` trait is detected
1. Hello! Welcome to `Messages With Hope`! This is meant to serve as a way to communicate quickly
with ambulances and medical needs
```Java
1. hello
2. hi
3. need help
4. start
5. help
6. help please
7. there
8. I need your help
9. start talk
10. start bot
```
2. If you want to know more about us, reply with `about`.
3. If you are in an emergency, reply with `proceed`.

### About Intent

> When `about` is detected
1. <Insert info here later>

### Proceed Intent ( When `proceed` is detected )

Follow the below steps to complete the proceeed intent, with each intent the example `utterancese`,

1. Name of the patient first, - **DONE**
```Java
1. name is zyz
2. name abc
3. Patient name is sfgdgf
4. Patients name is gdfgfdgfdgdfgdf
```

2. Ask for their age, - **DONE**
```Java
1. patients age is 4543
2. patient age is 46435
3. age is 44564573
4. 46645 age
5. 565645 years old
6. 45435 years
```

3. Disease - use the `disease` intent and insert `disease names` as `traits` ), - **DONE**
   1. What kind of disease is the patient suffering from?
   2. What do you need help with?
   3. What are the symptoms?
   4. Is it related to heart, lungs, kidneys, etc?
```Java
//  Wit.Ai inputted answers
1. heart trauma
2. needs a heart expert
3. heart disease
4. The patient needs a cardiologist
5. heart attack
6. problems with heart
7. I need to visit a heart hospital
8. nearest heart hospital
9. The patient has a heart problem
10. heart hospital
11. heart symtoms
12. heart
13. I need to go to the heart hospital quickly

```
> And repeating the same for { physically injured, trauma, injury, physical, kidneys, lungs }
> Give confirmation after getting the required `disease` aspect

4. Ask for their phone number
```Java
// Expecting a single number, at least
1. Phone Number is +923112809331
2. Phone number +923112809331
3. Phone is +923112809331
4. +923112809331
5. 03112809331
6. number ye hai +923112809331
7. number hai +923112809331
8. +92311280931 is the number
```

5. Ask user for their location
   1. Let user know that they can either enter address
```Java
1. My location is Block 2 Sector C North, City
2. Locaiton is 43325253ddfgdsff
3. Current location is dfsgfaegf
4. Place is 46534646235
5. location ye hai 454543535
6. is jagah per location hai 45434
7. fgafgugh43534g34 is the location
8. location yahaan hai 4fgfdggfsgerye
9. My location is Sector C Block 2 North, City
10. My location is Sector C North, City Block 2
11. Locaiton is Block 2 Sector C North, City
12. Locaiton is Sector C Block 2 North, City
13. Locaiton is Sector C North, City Block 2
15. Place is Block 2 Sector C North, City
16. Place is Sector C Block 2 North, City
17. Place is Sector C North, City Block 2
18. location ye hai Block 2 Sector C North, City
19. location ye hai Sector C Block 2 North, City
20. location ye hai Sector C North, City Block 2
21. is jagah per location hai Block 2 Sector C North, City
22. is jagah per location hai Sector C Block 2 North, City
23. is jagah per location hai Sector C North, City Block 2
24. Sector C North, City Block 2 is the location
25. Block 2 Sector C North, City is the location
26. Sector C Block 2 North, City is the location
27. location yahaan hai Sector C North, City Block 2
28. location yahaan hai Block 2 Sector C North, City
29. location yahaan hai Sector C Block 2 North, City
```
   2. Or send location via pin in messenger ( only available through the mobile app )
```Java
// Should be dealth in the backend, not really for Wit Ai
```

6. Confirm to the user that their request has been forwarded to XYZ ambulance service. Default is Aman.
   1. Show the information in the end which has been extracted by the bot in the end `\\ optional`
```Java
// The detected disease, and the information the bot obtained from the user
1. The bot understood that the disease here is ${Disease.name}, L
  1. Ask for confirmation, L
  2. If correct, with a yes, y, Y, then continue with a thank you message, L
  3. If wrong, Go back to the start, L
3. Ask for the nearest location to the patient, L
  6. Ask that the proper name is inserted, to avoid noisy data and confusion, L
  7. Ask so that it can find the nearest required hospitals, L
  8. If the API is unable to find the location given, ask for another location, L
  9. If it can, give an output of all the locations founds, L
  10. This is so because the bot just tells you what the nearest locaiton is, but does not know the specialization, hence, it leaves that upto the customer and the user, L
```

### Check If All The Input Was Correctly Given

Check if none of the information is empty. Keep asking back if it is

## LOCATION INTENT - EXTRACTING LOCATION OF THE USER AND HOSPITAL

- Use the Google Maps API to get the user's location on the map
- Getting data of nearby hospitals to the user `// any limits?`
- Map them on the web page
- Send link of web page to user
- Send information to the ambulance in the end

> Send all the data to aman ambulance ( for now ), post phase of completion

# Get Data From User Using Entitites

- The entities required are
  - Location ( GPS, Longitude / Latitude ), ***discussed***
  - Messages ( The actual body of text ), ***discussed***
  - Diseases ( Lungs, Heart, Kidney, Brain, Physical Injury, Surgery, Trauma, ), ***discussed***
  - Phone Number, ***discussed***
