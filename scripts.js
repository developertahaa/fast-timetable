$(document).ready(function() {
    var combinedTimetable = {}; // To hold results for all sections combined by day
    var allCourses = new Set(); // To store unique courses

    $('#add-section').on('click', function() {
        var newInput = '<div class="input-group mb-3"><input type="text" class="form-control section-input" placeholder="Enter section (e.g., BCS-5M)"><div class="input-group-append"><button class="btn btn-outline-secondary remove-section" type="button">-</button></div></div>';
        $('#search-section').append(newInput);
    });

    $(document).on('click', '.remove-section', function() {
        $(this).closest('.input-group').remove();
    });

    $('#excel-file').on('change', function(event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            window.workbook = workbook; // Store workbook globally for later use
        };
        reader.readAsArrayBuffer(file);
    });

    $('#search-button').on('click', function() {
        var sections = [];
        $('.section-input').each(function() {
            var section = $(this).val().trim();
            if (section) {
                sections.push(section);
            }
        });

        if (window.workbook) {
            $('#timetable').empty().show();
            combinedTimetable = {}; // Reset combinedTimetable
            allCourses = new Set(); // Reset allCourses

            sections.forEach(function(section) {
                searchSectionInWorkbook(window.workbook, section, combinedTimetable);
            });

            // Populate filter options
            populateCourseFilter();
        } else {
            alert('Please upload an Excel file first.');
        }
    });

    function searchSectionInWorkbook(workbook, section, combinedTimetable) {
        workbook.SheetNames.forEach(function(sheetName) {
            var sheet = workbook.Sheets[sheetName];
            var data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            var timings = data[2]; // Assuming third row contains timings

            data.forEach(function(row, rowIndex) {
                if (rowIndex <= 1) return; // Skip header and timing rows

                var venue = row[0]; // Assuming first column contains venue names

                row.forEach(function(cell, colIndex) {
                    if (colIndex === 0 || !cell) return; // Skip venue column and empty cells

                    if (cell.toString().includes(section)) {
                        var courseInfo = cell.split("\n");
                        var courseName = courseInfo[0]; // Extract course name
                        var instructorName = courseInfo[1]; // Extract instructor name
                        var time = timings[colIndex] || 'Unknown Time'; // Get timing based on column index

                        if (!combinedTimetable[sheetName]) {
                            combinedTimetable[sheetName] = {};
                        }

                        if (!combinedTimetable[sheetName][time]) {
                            combinedTimetable[sheetName][time] = [];
                        }

                        combinedTimetable[sheetName][time].push({
                            section: section,
                            venue: venue,
                            course: courseName,
                            instructor: instructorName
                        });

                        allCourses.add(courseName); // Add to unique courses set
                    }
                });
            });
        });
    }

    function populateCourseFilter() {
        var $filter = $('#course-filter');
        $filter.empty();

        allCourses.forEach(function(course) {
            $filter.append('<div class="form-check"><input class="form-check-input" type="checkbox" value="' + course + '" id="course-' + course.replace(/\s+/g, '-') + '"><label class="form-check-label" for="course-' + course.replace(/\s+/g, '-') + '">' + course + '</label></div>');
        });
    }

    $('#filter-button').on('click', function() {
        filterTimetable();
    });

    function filterTimetable() {
        var selectedCourses = [];
        $('#course-filter input:checked').each(function() {
            selectedCourses.push($(this).val());
        });

        var filteredTimetable = {};

        Object.keys(combinedTimetable).forEach(function(day) {
            filteredTimetable[day] = {};
            var dayTimetable = combinedTimetable[day];

            Object.keys(dayTimetable).forEach(function(time) {
                var entries = dayTimetable[time];
                var filteredEntries = entries.filter(function(entry) {
                    return selectedCourses.includes(entry.course);
                });

                if (filteredEntries.length > 0) {
                    filteredTimetable[day][time] = filteredEntries;
                }
            });
        });

        displayCombinedTimetable(filteredTimetable);
    }

    function displayCombinedTimetable(timetable) {
        var html = '';
    
        Object.keys(timetable).forEach(function(day) {
            html += '<h3>' + day + '</h3><table class="table table-bordered"><thead><tr>';
            html += '<th>Time</th><th>Venue & Course</th><th>Section & Instructor</th></tr></thead><tbody>';
    
            var dayTimetable = timetable[day];
            var dayHasClasses = false;
    
            var sortedTimes = Object.keys(dayTimetable).sort();
    
            sortedTimes.forEach(function(time) {
                var entries = dayTimetable[time];
                dayHasClasses = true;
    
                entries.forEach(function(entry, index) {
                    var bgColor = index > 0 ? ' style="background-color: #ffcccc;"' : ''; // Apply red background to overlapping classes
                    html += '<tr' + bgColor + '>';
                    html += '<td>' + time + '</td>';
                    html += '<td>' + entry.course + '<br>' + entry.venue + '</td>'; // Add line break between course and venue
                    html += '<td>' + entry.section + '<br>' + entry.instructor + '</td>'; // Add line break between section and instructor
                    html += '</tr>';
                });
            });
    
            if (!dayHasClasses) {
                html += '<tr><td colspan="3" class="text-center"><strong>Off Day!</strong> 😊</td></tr>';
            }
    
            html += '</tbody></table>';
        });
    
        if (html) {
            $('#timetable').html(html);
        } else {
            $('#timetable').html('<p>No classes found for the entered sections.</p>');
        }
    }
});
